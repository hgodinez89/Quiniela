import { STAGES, type Stage } from "@/lib/types";

export interface PhasePointRow {
  stage: Stage;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  exact_hits: number;
}

export interface PhaseStatusRow {
  stage: Stage;
  total: number;
  finished: number;
}

export interface WinnerEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface PhaseWinner {
  stage: Stage;
  state: "not_started" | "in_progress" | "complete";
  winners: WinnerEntry[]; // co-ganadores (complete) o líderes (in_progress)
  points: number;
}

export interface Champion {
  state: "none" | "leader" | "champion";
  winners: WinnerEntry[];
  points: number;
}

type Scored = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  exact_hits: number;
};

// Top por puntos; desempate por aciertos exactos; co-ganadores si persiste.
function pickTop(rows: Scored[]): { winners: WinnerEntry[]; points: number } {
  if (rows.length === 0) return { winners: [], points: 0 };
  const bestP = Math.max(...rows.map((r) => r.points));
  if (bestP <= 0) return { winners: [], points: 0 };
  const top = rows.filter((r) => r.points === bestP);
  const bestE = Math.max(...top.map((r) => r.exact_hits));
  const winners = top
    .filter((r) => r.exact_hits === bestE)
    .map((r) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
    }));
  return { winners, points: bestP };
}

export function computeWinners(
  rows: PhasePointRow[],
  status: PhaseStatusRow[]
): { champion: Champion; phases: PhaseWinner[] } {
  const statusByStage = new Map(status.map((s) => [s.stage, s]));

  const phases: PhaseWinner[] = STAGES.map((stage) => {
    const st = statusByStage.get(stage);
    const total = st?.total ?? 0;
    const finished = st?.finished ?? 0;
    if (finished === 0) {
      return { stage, state: "not_started", winners: [], points: 0 };
    }
    const stageRows = rows.filter((r) => r.stage === stage);
    const { winners, points } = pickTop(stageRows);
    const state = total > 0 && finished >= total ? "complete" : "in_progress";
    return { stage, state, winners, points };
  });

  // Campeón: agregación por usuario sumando todas las fases.
  const agg = new Map<string, Scored>();
  for (const r of rows) {
    const cur =
      agg.get(r.user_id) ??
      {
        user_id: r.user_id,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        points: 0,
        exact_hits: 0,
      };
    cur.points += r.points;
    cur.exact_hits += r.exact_hits;
    agg.set(r.user_id, cur);
  }
  const { winners, points } = pickTop([...agg.values()]);
  const finalFinished = (statusByStage.get("final")?.finished ?? 0) > 0;
  const champion: Champion = {
    state: winners.length === 0 ? "none" : finalFinished ? "champion" : "leader",
    winners,
    points,
  };

  return { champion, phases };
}
