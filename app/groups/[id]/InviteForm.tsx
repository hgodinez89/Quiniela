"use client";

import { useActionState } from "react";
import { inviteMember, type ActionState } from "./actions";

export default function InviteForm({ groupId }: { groupId: string }) {
  const action = inviteMember.bind(null, groupId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    { ok: false }
  );

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold">Invitar participante</h3>
      <p className="mb-3 text-xs text-muted">
        Solo tú (creador) puedes invitar. Debe ser un correo @gmail.com.
      </p>
      <form action={formAction} className="flex gap-2">
        <input
          name="email"
          type="email"
          className="input"
          placeholder="amigo@gmail.com"
          required
        />
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "…" : "Invitar"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state.ok && state.message && (
        <p className="mt-2 text-sm text-pitch">✓ {state.message}</p>
      )}
    </div>
  );
}
