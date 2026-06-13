"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MatchCard from "@/components/MatchCard";
import type { MatchWithTeams } from "@/lib/types";

const MATCH_SELECT = `
  *,
  home_team:teams!home_team_id(*),
  away_team:teams!away_team_id(*),
  stadium:stadiums(*)
`;

// Banner del partido en vivo. Se actualiza por Realtime (con polling de respaldo).
export default function LiveMatchBanner({
  initial,
}: {
  initial: MatchWithTeams | null;
}) {
  const [live, setLive] = useState<MatchWithTeams | null>(initial);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("status", "live")
      .order("kickoff_at", { ascending: true })
      .limit(1);
    setLive((data?.[0] ?? null) as MatchWithTeams | null);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("live-matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => refetch()
      )
      .subscribe();

    // Respaldo: refrescar cada 60s por si Realtime no está disponible.
    const interval = setInterval(refetch, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [refetch]);

  if (!live) {
    return (
      <div className="card p-5 text-center text-sm text-muted">
        No hay ningún partido en vivo en este momento.
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-danger">
        <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
        En vivo
      </h2>
      <MatchCard match={live} highlightLive />
    </div>
  );
}
