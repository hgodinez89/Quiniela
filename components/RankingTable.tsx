"use client";

import { ordinal } from "@/lib/format";
import { STAGE_SHORT, type Stage } from "@/lib/types";
import CollapsibleCard from "@/components/CollapsibleCard";
import { phaseRanking, type PhaseRankMember } from "@/lib/ranking";
import type { PhasePointRow } from "@/lib/winners";

export interface RankingEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  predicted_count: number;
  position: number;
}

interface Row {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  position: number;
  points: number;
  subtext: string;
}

export default function RankingTable({
  entries,
  members,
  phasePoints,
  phases,
  mode,
  stage,
  onModeChange,
  onStageChange,
  meId,
  creatorId,
}: {
  entries: RankingEntry[];
  members: PhaseRankMember[];
  phasePoints: PhasePointRow[];
  phases: Stage[];
  mode: "tournament" | "phase";
  stage: Stage;
  onModeChange: (m: "tournament" | "phase") => void;
  onStageChange: (s: Stage) => void;
  meId: string;
  creatorId: string;
}) {
  // Filas según el modo
  let rows: Row[];
  if (mode === "tournament") {
    rows = [...entries]
      .sort(
        (a, b) =>
          b.total_points - a.total_points ||
          (a.display_name ?? "").localeCompare(b.display_name ?? "", "es", {
            sensitivity: "base",
          })
      )
      .map((e) => ({
        user_id: e.user_id,
        display_name: e.display_name,
        avatar_url: e.avatar_url,
        position: e.position,
        points: e.total_points,
        subtext: `${e.predicted_count} predich.`,
      }));
  } else {
    rows = phaseRanking(members, phasePoints, stage).map((r) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      position: r.position,
      points: r.points,
      subtext: `${r.exact_hits} exacto${r.exact_hits === 1 ? "" : "s"}`,
    }));
  }

  const allZero = rows.length > 0 && rows.every((r) => r.points === 0);

  return (
    <CollapsibleCard
      title="Ranking del grupo"
      defaultOpen
      right={allZero ? "Sin puntos aún" : undefined}
    >
      {/* Conmutador Torneo / Por fase */}
      <div className="flex gap-1.5 px-4 pt-3">
        <button
          type="button"
          onClick={() => onModeChange("tournament")}
          className={`badge px-3 py-1.5 ${
            mode === "tournament"
              ? "bg-pitch text-white"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          Torneo
        </button>
        <button
          type="button"
          onClick={() => onModeChange("phase")}
          className={`badge px-3 py-1.5 ${
            mode === "phase"
              ? "bg-pitch text-white"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          Por fase
        </button>
      </div>

      {/* Selector de fase (solo en modo Por fase) */}
      {mode === "phase" && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-2">
          {phases.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStageChange(s)}
              className={`badge whitespace-nowrap px-3 py-1.5 ${
                s === stage
                  ? "bg-foreground text-background"
                  : "border border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {STAGE_SHORT[s]}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-2 divide-y divide-border border-t border-border">
        {rows.map((e) => {
          const isMe = e.user_id === meId;
          return (
            <li
              key={e.user_id}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                isMe ? "bg-pitch/5" : ""
              }`}
            >
              <span className="w-7 text-center text-sm font-bold tabular-nums text-muted">
                {e.points === 0 ? "—" : ordinal(e.position)}
              </span>
              {e.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-pitch/15 text-xs font-bold text-pitch">
                  {(e.display_name || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="flex-1 truncate text-sm">
                {e.display_name || "Sin nombre"}
                {isMe && <span className="text-muted"> (tú)</span>}
                {e.user_id === creatorId && (
                  <span className="badge ml-2 bg-accent/20 text-[10px] text-foreground">
                    Admin
                  </span>
                )}
              </span>
              <span className="text-right">
                <span className="block text-sm font-bold tabular-nums">
                  {e.points} pts
                </span>
                <span className="block text-[11px] text-muted">{e.subtext}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </CollapsibleCard>
  );
}
