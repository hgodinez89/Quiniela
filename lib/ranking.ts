import type { PhasePointRow, PhaseStatusRow } from "@/lib/winners";
import { STAGES, type Stage } from "@/lib/types";

export interface PhaseRankMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface PhaseRankRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  exact_hits: number;
  position: number;
}

// Ranking de una fase: TODOS los miembros (0 si no predijo esa fase),
// ordenados por puntos desc → exactos desc → nombre. Posición por rank denso;
// los de 0 puntos no llevan número (se muestran con "—" en la UI).
export function phaseRanking(
  members: PhaseRankMember[],
  phasePoints: PhasePointRow[],
  stage: Stage
): PhaseRankRow[] {
  const byUser = new Map<string, PhasePointRow>();
  for (const r of phasePoints) {
    if (r.stage === stage) byUser.set(r.user_id, r);
  }

  const rows = members.map((m) => {
    const p = byUser.get(m.user_id);
    return {
      user_id: m.user_id,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
      points: p ? Number(p.points) : 0,
      exact_hits: p ? Number(p.exact_hits) : 0,
      position: 0,
    };
  });

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.exact_hits - a.exact_hits ||
      (a.display_name ?? "").localeCompare(b.display_name ?? "", "es", {
        sensitivity: "base",
      })
  );

  // Posición por rank denso (mismos puntos+exactos comparten posición).
  let pos = 0;
  let prevKey = "";
  rows.forEach((r, i) => {
    const key = `${r.points}|${r.exact_hits}`;
    if (key !== prevKey) {
      pos = i + 1;
      prevKey = key;
    }
    r.position = pos;
  });

  return rows;
}

// Fases que existen en el torneo (total > 0), en orden, y la fase "actual"
// por defecto: la más avanzada con al menos un partido finalizado; si ninguna,
// la primera disponible.
export function availablePhases(status: PhaseStatusRow[]): {
  phases: Stage[];
  defaultStage: Stage;
} {
  const byStage = new Map(status.map((s) => [s.stage, s]));
  const phases = STAGES.filter((s) => (byStage.get(s)?.total ?? 0) > 0);
  let defaultStage: Stage = phases[0] ?? "group";
  for (const s of phases) {
    if ((byStage.get(s)?.finished ?? 0) > 0) defaultStage = s;
  }
  return { phases, defaultStage };
}
