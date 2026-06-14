import type { MatchWithTeams, Team } from "@/lib/types";

export interface StandingRow {
  team: Team;
  pj: number; // jugados
  g: number; // ganados
  e: number; // empatados
  p: number; // perdidos
  gf: number; // goles a favor
  gc: number; // goles en contra
  dg: number; // diferencia de goles
  pts: number; // puntos
}

export interface GroupStandings {
  group: string; // letra A..L
  rows: StandingRow[];
}

// Calcula la tabla de posiciones por grupo a partir de los partidos de grupo.
// Cuenta solo partidos finalizados; los equipos aparecen aunque no hayan jugado.
export function computeGroupStandings(
  matches: MatchWithTeams[]
): GroupStandings[] {
  const groups = new Map<string, Map<number, StandingRow>>();

  const ensure = (letter: string, team: Team): StandingRow => {
    if (!groups.has(letter)) groups.set(letter, new Map());
    const g = groups.get(letter)!;
    if (!g.has(team.id)) {
      g.set(team.id, {
        team,
        pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0,
      });
    }
    return g.get(team.id)!;
  };

  for (const m of matches) {
    if (m.stage !== "group" || !m.group_letter || !m.home_team || !m.away_team)
      continue;
    const hr = ensure(m.group_letter, m.home_team);
    const ar = ensure(m.group_letter, m.away_team);

    if (m.status !== "finished" || m.home_score == null || m.away_score == null)
      continue;

    hr.pj++; ar.pj++;
    hr.gf += m.home_score; hr.gc += m.away_score;
    ar.gf += m.away_score; ar.gc += m.home_score;

    if (m.home_score > m.away_score) {
      hr.g++; hr.pts += 3; ar.p++;
    } else if (m.home_score < m.away_score) {
      ar.g++; ar.pts += 3; hr.p++;
    } else {
      hr.e++; ar.e++; hr.pts++; ar.pts++;
    }
  }

  const result: GroupStandings[] = [];
  for (const [letter, map] of [...groups.entries()].sort()) {
    const rows = [...map.values()];
    for (const r of rows) r.dg = r.gf - r.gc;
    rows.sort(
      (a, b) =>
        b.pts - a.pts ||
        b.dg - a.dg ||
        b.gf - a.gf ||
        a.team.name.localeCompare(b.team.name)
    );
    result.push({ group: letter, rows });
  }
  return result;
}
