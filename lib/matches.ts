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

// Partido actual (en vivo real, o "en curso" por horario) + próximos N.
export async function getLiveAndUpcoming(
  supabase: SupabaseClient,
  upcomingCount = 6
): Promise<{
  current: MatchWithTeams | null;
  currentIsLive: boolean;
  upcoming: MatchWithTeams[];
}> {
  // 1) En vivo real (si la fuente lo provee)
  const { data: liveData } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "live")
    .order("kickoff_at", { ascending: true })
    .limit(1);
  let current = (liveData?.[0] ?? null) as MatchWithTeams | null;
  let currentIsLive = !!current;

  const now = new Date();
  const nowIso = now.toISOString();

  // 2) Si no hay live, buscar uno "en curso" por horario
  if (!current) {
    const windowStart = new Date(
      now.getTime() - IN_PROGRESS_MINUTES * 60_000
    ).toISOString();
    const { data: byTime } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .neq("status", "finished")
      .lte("kickoff_at", nowIso)
      .gt("kickoff_at", windowStart)
      .order("kickoff_at", { ascending: false })
      .limit(1);
    current = (byTime?.[0] ?? null) as MatchWithTeams | null;
    currentIsLive = false;
  }

  // 3) Próximos por horario
  const { data: upData } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .neq("status", "finished")
    .gt("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(upcomingCount + 1);

  const upcoming = ((upData ?? []) as unknown as MatchWithTeams[])
    .filter((m) => !current || m.id !== current.id)
    .slice(0, upcomingCount);

  return { current, currentIsLive, upcoming };
}
