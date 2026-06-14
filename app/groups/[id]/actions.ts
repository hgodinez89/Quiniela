"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema, predictionsBatchSchema } from "@/lib/validation";
import { sendInvitationEmail } from "@/lib/email";
import type { Stage } from "@/lib/types";

export type ActionState = { ok: boolean; error?: string; message?: string };

// --- Invitar por correo Gmail (solo creador; RLS lo refuerza) ---------------
export async function inviteMember(
  groupId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const parsed = inviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Correo inválido" };
  }

  const { error } = await supabase.from("group_invitations").insert({
    group_id: groupId,
    invited_email: parsed.data.email,
    invited_by: user.id,
  });

  let duplicate = false;
  if (error) {
    if (error.code === "23505") {
      duplicate = true; // ya invitado -> reenviamos el correo
    } else {
      // RLS bloquea a no-creadores -> mensaje genérico
      return { ok: false, error: "No se pudo crear la invitación." };
    }
  }

  // Datos para el correo
  const [{ data: group }, { data: profile }] = await Promise.all([
    supabase.from("bet_groups").select("name").eq("id", groupId).single(),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  const sent = await sendInvitationEmail({
    to: parsed.data.email,
    groupName: group?.name ?? "una quiniela",
    inviterName: profile?.display_name ?? "Un amigo",
  });

  revalidatePath(`/groups/${groupId}`);

  if (sent.ok) {
    return {
      ok: true,
      message: duplicate
        ? `Correo reenviado a ${parsed.data.email}`
        : `Invitación enviada por correo a ${parsed.data.email}`,
    };
  }

  // El correo no salió, pero la invitación quedó registrada.
  const why =
    sent.reason === "not_configured"
      ? "(falta configurar el envío de correos)"
      : "(no se pudo enviar el correo)";
  return {
    ok: true,
    message: `Invitación registrada ${why}. Pídele que entre con su Gmail: ${parsed.data.email}`,
  };
}

// --- Eliminar grupo (solo creador; RLS lo refuerza) -------------------------
// El borrado de la fila de bet_groups elimina en cascada miembros, invitaciones,
// predicciones y envíos (FKs on delete cascade). Acción IRREVERSIBLE.
export async function deleteGroup(groupId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data, error } = await supabase
    .from("bet_groups")
    .delete()
    .eq("id", groupId)
    .select("id");

  if (error) return { ok: false, error: "No se pudo eliminar el grupo." };
  // RLS deja 0 filas borradas si no eres el creador.
  if (!data || data.length === 0) {
    return { ok: false, error: "No tienes permiso para eliminar este grupo." };
  }

  revalidatePath("/");
  redirect("/");
}

// --- Quitar miembro (solo creador; RLS lo refuerza) -------------------------
export async function removeMember(
  groupId: string,
  userId: string
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: "No se pudo quitar al participante." };
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

// --- Guardar progreso de predicciones ---------------------------------------
export async function savePredictions(
  groupId: string,
  rawPredictions: { match_id: number; home_score: number; away_score: number }[]
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const parsed = predictionsBatchSchema.safeParse({
    group_id: groupId,
    predictions: rawPredictions,
  });
  if (!parsed.success) {
    return { ok: false, error: "Predicciones inválidas." };
  }

  if (parsed.data.predictions.length === 0) {
    return { ok: true, message: "Nada que guardar." };
  }

  const rows = parsed.data.predictions.map((p) => ({
    group_id: groupId,
    user_id: user.id,
    match_id: p.match_id,
    home_score: p.home_score,
    away_score: p.away_score,
  }));

  // RLS rechaza partidos ya iniciados o fases ya enviadas.
  const { error } = await supabase
    .from("predictions")
    .upsert(rows, { onConflict: "group_id,user_id,match_id" });

  if (error) {
    return {
      ok: false,
      error: "No se pudo guardar (algún partido ya inició o la fase fue enviada).",
    };
  }

  revalidatePath(`/groups/${groupId}`);
  return {
    ok: true,
    message: "Progreso guardado. Aún no has finalizado esta fase.",
  };
}

// --- Enviar fase completa ---------------------------------------------------
export async function submitPhase(
  groupId: string,
  stage: Stage
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const nowIso = new Date().toISOString();

  // Partidos predecibles de la fase: futuros y (en knockout) con equipos definidos.
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, kickoff_at, stage")
    .eq("stage", stage)
    .gt("kickoff_at", nowIso);
  if (mErr) return { ok: false, error: "No se pudo validar la fase." };

  const isKnockout = stage !== "group";
  const predictable = (matches ?? []).filter(
    (m) => !isKnockout || (m.home_team_id != null && m.away_team_id != null)
  );
  const pendingTeams = (matches ?? []).filter(
    (m) => isKnockout && (m.home_team_id == null || m.away_team_id == null)
  );

  if (predictable.length === 0) {
    return { ok: false, error: "No hay partidos por predecir en esta fase." };
  }
  if (pendingTeams.length > 0) {
    return {
      ok: false,
      error:
        "Aún hay cruces sin definir en esta fase. Podrás enviarla cuando todos los equipos estén definidos.",
    };
  }

  // ¿El usuario predijo todos los partidos predecibles?
  const ids = predictable.map((m) => m.id);
  const { data: preds, error: pErr } = await supabase
    .from("predictions")
    .select("match_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .in("match_id", ids);
  if (pErr) return { ok: false, error: "No se pudo validar la fase." };

  const predicted = new Set((preds ?? []).map((p) => p.match_id));
  const missing = ids.filter((id) => !predicted.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Te faltan ${missing.length} predicción(es) por completar.`,
    };
  }

  const { error: subErr } = await supabase
    .from("phase_submissions")
    .insert({ group_id: groupId, user_id: user.id, stage });
  if (subErr) {
    if (subErr.code === "23505")
      return { ok: false, error: "Ya habías enviado esta fase." };
    return { ok: false, error: "No se pudo enviar la fase." };
  }

  revalidatePath(`/groups/${groupId}`);
  return {
    ok: true,
    message: "¡Fase enviada! Ahora puedes ver las predicciones de los demás.",
  };
}
