import type { MatchWithTeams } from "@/lib/types";

// Puntaje: marcador exacto = 3, acierta resultado = 1, else 0.
// Penales: si el campo terminó empatado y se definió por penales, además se
// otorga 1 pt a quien predijo al ganador de la tanda (penalty_winner).
// Devuelve null si el partido aún no ha finalizado.
export function predictionPoints(
  pred: { home_score: number; away_score: number },
  match: Pick<
    MatchWithTeams,
    "status" | "home_score" | "away_score" | "penalty_winner"
  >
): number | null {
  if (
    match.status !== "finished" ||
    match.home_score == null ||
    match.away_score == null
  ) {
    return null;
  }
  if (pred.home_score === match.home_score && pred.away_score === match.away_score) {
    return 3;
  }
  if (
    Math.sign(pred.home_score - pred.away_score) ===
    Math.sign(match.home_score - match.away_score)
  ) {
    return 1;
  }
  // Ajuste por penales: predijo a un ganador que coincide con el de la tanda.
  if (
    match.penalty_winner === "home" &&
    pred.home_score > pred.away_score
  ) {
    return 1;
  }
  if (
    match.penalty_winner === "away" &&
    pred.away_score > pred.home_score
  ) {
    return 1;
  }
  return 0;
}
