"use client";

import { useState, useTransition } from "react";
import { deleteGroup } from "./actions";

export default function DeleteGroupButton({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = confirmText.trim() === groupName.trim();

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirmText("");
    setError(null);
  }

  function onConfirm() {
    if (!canDelete) return;
    setError(null);
    startTransition(async () => {
      // En éxito, la acción redirige a "/" (no retorna).
      const res = await deleteGroup(groupId);
      if (res && !res.ok) setError(res.error ?? "No se pudo eliminar.");
    });
  }

  return (
    <>
      <div className="card border-danger/30 p-4">
        <h3 className="text-sm font-semibold text-danger">Zona de peligro</h3>
        <p className="mb-3 mt-1 text-xs text-muted">
          Eliminar el grupo borra de forma permanente a todos los participantes,
          sus predicciones e invitaciones. No se puede deshacer.
        </p>
        <button className="btn-danger" onClick={() => setOpen(true)}>
          Eliminar grupo
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-danger">Eliminar grupo</h2>
            <p className="mt-2 text-sm">
              Esta acción es <strong>permanente</strong> y{" "}
              <strong>no se puede deshacer</strong>. Se eliminarán:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted">
              <li>El grupo «{groupName}»</li>
              <li>Todos los participantes</li>
              <li>Todas sus predicciones</li>
              <li>Las invitaciones asociadas</li>
            </ul>

            <label className="label mt-4" htmlFor="confirm">
              Escribe el nombre del grupo para confirmar:
            </label>
            <input
              id="confirm"
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={groupName}
              autoComplete="off"
            />

            {error && <p className="mt-2 text-sm text-danger">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-outline" onClick={close} disabled={pending}>
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={onConfirm}
                disabled={!canDelete || pending}
              >
                {pending ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
