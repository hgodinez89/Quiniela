import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchWithTeams, Stage } from "@/lib/types";

const MATCH_SELECT = `
  *,
  home_team:teams!home_team_id(*),
  away_team:teams!away_team_id(*),
  stadium:stadiums(*)
`;

export async function getStageMatches(
  supabase: SupabaseClient,
  stage: Stage
): Promise<MatchWithTeams[]> {
  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("stage", stage)
    .order("kickoff_at", { ascending: true });
  return (data ?? []) as unknown as MatchWithTeams[];
}

const KNOCKOUT_STAGES = ["r32", "r16", "qf", "sf", "third", "final"];

export async function getKnockoutMatches(
  supabase: SupabaseClient
): Promise<MatchWithTeams[]> {
  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .in("stage", KNOCKOUT_STAGES)
    .order("kickoff_at", { ascending: true });
  return (data ?? []) as unknown as MatchWithTeams[];
}

// Ventana (min) tras el kickoff durante la cual consideramos un partido "en curso"
// cuando la fuente no provee estado en vivo (caso openfootball).
const IN_PROGRESS_MINUTES = 150;

// Partidos actuales (todos los en vivo, o los "en curso" por horario) + próximos N.
export async function getLiveAndUpcoming(
  supabase: SupabaseClient,
  upcomingCount = 6
): Promise<{
  currents: MatchWithTeams[];
  currentsAreLive: boolean;
  upcoming: MatchWithTeams[];
}> {
  // 1) En vivo real (todos los que la fuente marca live)
  const { data: liveData } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "live")
    .order("kickoff_at", { ascending: true });
  let currents = (liveData ?? []) as unknown as MatchWithTeams[];
  let currentsAreLive = currents.length > 0;

  const now = new Date();
  const nowIso = now.toISOString();

  // 2) Si no hay live, buscar los "en curso" por horario (todos en la ventana)
  if (currents.length === 0) {
    const windowStart = new Date(
      now.getTime() - IN_PROGRESS_MINUTES * 60_000
    ).toISOString();
    const { data: byTime } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .neq("status", "finished")
      .lte("kickoff_at", nowIso)
      .gt("kickoff_at", windowStart)
      .order("kickoff_at", { ascending: false });
    currents = (byTime ?? []) as unknown as MatchWithTeams[];
    currentsAreLive = false;
  }

  // 3) Próximos por horario (excluyendo los actuales)
  const currentIds = new Set(currents.map((m) => m.id));
  const { data: upData } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .neq("status", "finished")
    .gt("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(upcomingCount + currentIds.size + 1);

  const upcoming = ((upData ?? []) as unknown as MatchWithTeams[])
    .filter((m) => !currentIds.has(m.id))
    .slice(0, upcomingCount);

  return { currents, currentsAreLive, upcoming };
}
