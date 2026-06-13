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

// Partido en vivo (si hay) + próximos N por horario.
export async function getLiveAndUpcoming(
  supabase: SupabaseClient,
  upcomingCount = 6
): Promise<{ live: MatchWithTeams | null; upcoming: MatchWithTeams[] }> {
  const { data: liveData } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "live")
    .order("kickoff_at", { ascending: true })
    .limit(1);
  const live = (liveData?.[0] ?? null) as MatchWithTeams | null;

  const nowIso = new Date().toISOString();
  const { data: upData } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .neq("status", "finished")
    .gt("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(upcomingCount + 1);

  const upcoming = ((upData ?? []) as unknown as MatchWithTeams[])
    .filter((m) => !live || m.id !== live.id)
    .slice(0, upcomingCount);

  return { live, upcoming };
}
