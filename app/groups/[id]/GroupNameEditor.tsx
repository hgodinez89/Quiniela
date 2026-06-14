"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameGroup } from "./actions";

export default function GroupNameEditor({
  groupId,
  initialName,
  canEdit,
}: {
  groupId: string;
  initialName: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <h1 className="text-2xl font-extrabold tracking-tight">{initialName}</h1>
    );
  }

  function open() {
    setValue(initialName);
    setError(null);
    setEditing(true);
  }
  function cancel() {
    if (pending) return;
    setEditing(false);
    setError(null);
  }
  function save() {
    const name = value.trim();
    if (!name || name === initialName) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await renameGroup(groupId, name);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo renombrar.");
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">{initialName}</h1>
        <button
          type="button"
          onClick={open}
          aria-label="Editar nombre del grupo"
          title="Editar nombre"
          className="text-muted transition-colors hover:text-pitch"
        >
          <svg
            width="18"
            height="18"
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
    <div>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          className="input text-xl font-bold"
          value={value}
          maxLength={80}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          aria-label="Guardar nombre"
          className="btn-primary px-3"
        >
          {pending ? "…" : "✓"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          aria-label="Cancelar"
          className="btn-outline px-3"
        >
          ✕
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
