"use client";

import { useActionState } from "react";
import { createGroup, type ActionState } from "./actions";

export default function NewGroupForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createGroup,
    { ok: false }
  );

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <div>
        <label className="label" htmlFor="name">
          Nombre del grupo
        </label>
        <input
          id="name"
          name="name"
          className="input"
          maxLength={80}
          required
          placeholder="La quiniela de la oficina"
        />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-24"
          maxLength={500}
          placeholder="Reglas, premio, etc."
        />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Creando…" : "Crear grupo"}
      </button>
    </form>
  );
}
