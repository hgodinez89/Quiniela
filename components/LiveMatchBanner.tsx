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

const IN_PROGRESS_MINUTES = 150;

// Banner de los partidos actuales (en vivo reales o "en curso" por horario).
// Se actualiza por Realtime (con polling de respaldo cada 60s).
export default function LiveMatchBanner({
  initial,
  initialIsLive = false,
}: {
  initial: MatchWithTeams[];
  initialIsLive?: boolean;
}) {
  const [currents, setCurrents] = useState<MatchWithTeams[]>(initial);
  const [isLive, setIsLive] = useState<boolean>(initialIsLive);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    // 1) En vivo real (todos)
    const { data: liveData } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("status", "live")
      .order("kickoff_at", { ascending: true });
    if (liveData && liveData.length > 0) {
      setCurrents(liveData as unknown as MatchWithTeams[]);
      setIsLive(true);
      return;
    }
    // 2) En curso por horario (todos en la ventana)
    const now = Date.now();
    const windowStart = new Date(now - IN_PROGRESS_MINUTES * 60_000).toISOString();
    const { data: byTime } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .neq("status", "finished")
      .lte("kickoff_at", new Date(now).toISOString())
      .gt("kickoff_at", windowStart)
      .order("kickoff_at", { ascending: false });
    setCurrents((byTime ?? []) as unknown as MatchWithTeams[]);
    setIsLive(false);
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

  if (currents.length === 0) {
    return (
      <div className="card p-5 text-center text-sm text-muted">
        No hay ningún partido en curso en este momento.
      </div>
    );
  }

  return (
    <div>
      <h2
        className={`mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${
          isLive ? "text-danger" : "text-pitch"
        }`}
      >
        <span
          className={`h-2 w-2 animate-pulse rounded-full ${
            isLive ? "bg-danger" : "bg-pitch"
          }`}
        />
        {isLive ? "En vivo" : "En curso"}
        {currents.length > 1 ? ` (${currents.length})` : ""}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {currents.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            highlightLive={isLive}
            inProgress={!isLive}
          />
        ))}
      </div>
    </div>
  );
}
