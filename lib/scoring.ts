import type { MatchWithTeams } from "@/lib/types";

// Puntaje: marcador exacto = 3, acierta resultado = 1, else 0.
// Devuelve null si el partido aún no ha finalizado.
export function predictionPoints(
  pred: { home_score: number; away_score: number },
  match: Pick<MatchWithTeams, "status" | "home_score" | "away_score">
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
  return 0;
}
