"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";

export type ActionState = { ok: boolean; error?: string; message?: string };

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    description: formData.get("description") ?? "",
    avatar_url: formData.get("avatar_url") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      description: parsed.data.description || null,
      avatar_url: parsed.data.avatar_url || null,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar el perfil" };

  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true, message: "Perfil actualizado" };
}
