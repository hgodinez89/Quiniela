import type { MatchWithTeams, Stage } from "@/lib/types";

// Número de partido de openfootball, guardado como external_id 'of-<num>'.
export function matchNum(m: MatchWithTeams): number | null {
  const mm = (m.external_id ?? "").match(/^of-(\d+)$/);
  return mm ? Number(mm[1]) : null;
}

// Ganador de un partido finalizado (true = local). null si no resuelto.
// En empate decidido por penales, gana quien ganó la tanda (penalty_winner).
export function winnerIsHome(m: MatchWithTeams): boolean | null {
  if (m.status !== "finished" || m.home_score == null || m.away_score == null)
    return null;
  if (m.home_score === m.away_score) {
    if (m.penalty_winner === "home") return true;
    if (m.penalty_winner === "away") return false;
    return null;
  }
  return m.home_score > m.away_score;
}

// Números de los cruces que alimentan a este partido (solo ganadores "W<n>").
// Usa los feeders inmutables (no se borran al resolver el cruce). Respaldo a los
// placeholders por si un slot aún no tuviera feeder poblado.
export function feederNums(m: MatchWithTeams): number[] {
  const out: number[] = [];
  const sources = [
    m.home_feeder ?? m.home_placeholder,
    m.away_feeder ?? m.away_placeholder,
  ];
  for (const ph of sources) {
    const fm = (ph ?? "").match(/^W(\d+)$/i);
    if (fm) out.push(Number(fm[1]));
  }
  return out;
}

export interface BracketColumn {
  stage: Stage;
  matches: MatchWithTeams[];
}

// Construye las columnas del cuadro (R32 → … → Final) en orden de llave, a
// partir de los feeders codificados en los placeholders ("W74" = ganador del 74).
// Devuelve también el partido por el tercer puesto (fuera del árbol principal).
export function buildBracketColumns(ko: MatchWithTeams[]): {
  columns: BracketColumn[];
  third: MatchWithTeams | null;
} {
  const byNum = new Map<number, MatchWithTeams>();
  for (const m of ko) {
    const n = matchNum(m);
    if (n != null) byNum.set(n, m);
  }

  const finalM = ko.find((m) => m.stage === "final");
  const third = ko.find((m) => m.stage === "third") ?? null;
  if (!finalM) return { columns: [], third };

  const levels: MatchWithTeams[][] = [];
  let frontier: number[] = [matchNum(finalM)!];

  while (frontier.length) {
    const levelMatches: MatchWithTeams[] = [];
    const next: number[] = [];
    for (const num of frontier) {
      const m = byNum.get(num);
      if (!m) continue;
      levelMatches.push(m);
      next.push(...feederNums(m)); // solo ganadores alimentan el árbol
    }
    if (levelMatches.length) levels.push(levelMatches);
    frontier = next;
  }

  // levels[0] = final … último = R32. Invertimos para mostrar R32 a la izquierda.
  const columns = levels
    .slice()
    .reverse()
    .map((ms) => ({ stage: ms[0].stage, matches: ms }));

  return { columns, third };
}
