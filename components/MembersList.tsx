"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import RemoveMemberButton from "@/app/groups/[id]/RemoveMemberButton";

export interface MemberEntry {
  user_id: string;
  role: "admin" | "member";
  profile: Profile | null;
}

export default function MembersList({
  members,
  groupId,
  creatorId,
  meId,
  canManage,
}: {
  members: MemberEntry[];
  groupId: string;
  creatorId: string;
  meId: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false); // colapsado por defecto

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-background"
      >
        <span>Participantes ({members.length})</span>
        <span aria-hidden className="text-muted">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
      <ul className="divide-y divide-border border-t border-border">
        {members.map((m) => {
          const name = m.profile?.display_name || "Sin nombre";
          const isCreator = m.user_id === creatorId;
          return (
            <li key={m.user_id} className="flex items-center gap-3 px-4 py-2.5">
              {m.profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.profile.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-pitch/15 text-xs font-bold text-pitch">
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="flex-1 truncate text-sm">
                {name}
                {m.user_id === meId && <span className="text-muted"> (tú)</span>}
              </span>
              {isCreator ? (
                <span className="badge bg-accent/20 text-[10px] text-foreground">
                  Creador · Admin
                </span>
              ) : (
                canManage && (
                  <RemoveMemberButton groupId={groupId} userId={m.user_id} />
                )
              )}
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
