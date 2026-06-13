"use client";

import { useActionState, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { updateProfile, type ActionState } from "./actions";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export default function ProfileForm({
  userId,
  email,
  profile,
}: {
  userId: string;
  email: string;
  profile: Profile | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateProfile,
    { ok: false }
  );

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError("La imagen no debe superar 2 MB.");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploadError("No se pudo subir la imagen.");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  }

  const initial = (profile?.display_name || email || "?")
    .slice(0, 1)
    .toUpperCase();

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            className="h-20 w-20 rounded-full object-cover ring-2 ring-pitch/20"
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full bg-pitch/15 text-2xl font-bold text-pitch">
            {initial}
          </span>
        )}
        <div>
          <button
            type="button"
            className="btn-outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Subiendo…" : "Cambiar foto"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
          {uploadError && (
            <p className="mt-1 text-xs text-danger">{uploadError}</p>
          )}
        </div>
      </div>

      <input type="hidden" name="avatar_url" value={avatarUrl} />

      <div>
        <label className="label" htmlFor="display_name">
          Nombre
        </label>
        <input
          id="display_name"
          name="display_name"
          className="input"
          defaultValue={profile?.display_name ?? ""}
          maxLength={60}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          className="input bg-background text-muted"
          value={email}
          readOnly
          disabled
        />
        <p className="mt-1 text-xs text-muted">El correo no se puede editar.</p>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-24"
          defaultValue={profile?.description ?? ""}
          maxLength={300}
          placeholder="Cuéntanos algo sobre ti…"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending || uploading}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {state.ok && state.message && (
          <span className="text-sm text-pitch">✓ {state.message}</span>
        )}
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
