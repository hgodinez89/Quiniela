"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGroupDescription } from "./actions";

export default function GroupDescriptionEditor({
  groupId,
  initialDescription,
  canEdit,
}: {
  groupId: string;
  initialDescription: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const initial = initialDescription ?? "";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // No editable: solo muestra el texto (o nada si está vacío).
  if (!canEdit) {
    return initial ? (
      <p className="mt-1 text-sm text-muted">{initial}</p>
    ) : null;
  }

  function open() {
    setValue(initial);
    setError(null);
    setEditing(true);
  }
  function cancel() {
    if (pending) return;
    setEditing(false);
    setError(null);
  }
  function save() {
    const next = value.trim();
    if (next === initial) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateGroupDescription(groupId, next);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo actualizar.");
      }
    });
  }

  if (editing) {
    return (
      <div className="mt-2">
        <textarea
          autoFocus
          className="input min-h-20 text-sm"
          value={value}
          maxLength={500}
          disabled={pending}
          placeholder="Reglas, premio, etc."
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
        />
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn-primary px-3"
          >
            {pending ? "…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="btn-outline px-3"
          >
            Cancelar
          </button>
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </div>
    );
  }

  // Vista no edición (creador)
  if (initial) {
    return (
      <div className="mt-1 flex items-start gap-2">
        <p className="text-sm text-muted">{initial}</p>
        <button
          type="button"
          onClick={open}
          aria-label="Editar descripción del grupo"
          title="Editar descripción"
          className="mt-0.5 shrink-0 text-muted transition-colors hover:text-pitch"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="mt-1 text-sm font-medium text-pitch hover:underline"
    >
      ＋ Añadir descripción
    </button>
  );
}
