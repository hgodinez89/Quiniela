"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { groupSchema } from "@/lib/validation";

export type ActionState = { ok: boolean; error?: string };

export async function createGroup(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { data: group, error } = await supabase
    .from("bet_groups")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      creator_id: user.id,
    })
    .select("id")
    .single();

  if (error || !group) return { ok: false, error: "No se pudo crear el grupo" };

  // El creador se agrega como admin.
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });
  if (memberError) return { ok: false, error: "No se pudo inicializar el grupo" };

  revalidatePath("/");
  redirect(`/groups/${group.id}`);
}
