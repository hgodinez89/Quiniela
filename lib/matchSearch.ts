import { sideLabel, type MatchWithTeams } from "@/lib/types";

function norm(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Filtra partidos por nombre de selección.
// "mexico" -> local o visitante contiene "mexico".
// "mexico vs suda" / "mexico versus suda" -> un término en cada lado (cualquier orden).
export function filterMatchesByQuery(
  matches: MatchWithTeams[],
  query: string
): MatchWithTeams[] {
  const q = norm(query);
  if (!q) return matches;

  const parts = q
    .split(/\s+(?:vs|versus|v)\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return matches.filter((m) => {
    const home = norm(sideLabel(m.home_team, m.home_placeholder).name);
    const away = norm(sideLabel(m.away_team, m.away_placeholder).name);
    if (parts.length >= 2) {
      const [a, b] = parts;
      return (
        (home.includes(a) && away.includes(b)) ||
        (home.includes(b) && away.includes(a))
      );
    }
    return home.includes(q) || away.includes(q);
  });
}
