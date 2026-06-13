"use client";

import { useTransition } from "react";
import { removeMember } from "./actions";

export default function RemoveMemberButton({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="text-xs text-muted hover:text-danger disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Quitar a este participante del grupo?")) return;
        startTransition(async () => {
          await removeMember(groupId, userId);
        });
      }}
    >
      {pending ? "…" : "Quitar"}
    </button>
  );
}
