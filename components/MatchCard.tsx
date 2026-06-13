import { sideLabel, STAGE_SHORT, type MatchWithTeams } from "@/lib/types";
import { formatKickoff } from "@/lib/format";

function TeamLine({
  flag,
  name,
  score,
  known,
}: {
  flag: string | null;
  name: string;
  score: number | null;
  known: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 truncate">
        <span aria-hidden className="text-lg">
          {flag ?? "🏳️"}
        </span>
        <span className={`truncate ${known ? "" : "italic text-muted"}`}>
          {name}
        </span>
      </span>
      {score != null && (
        <span className="text-lg font-bold tabular-nums">{score}</span>
      )}
    </div>
  );
}

export default function MatchCard({
  match,
  highlightLive = false,
}: {
  match: MatchWithTeams;
  highlightLive?: boolean;
}) {
  const home = sideLabel(match.home_team, match.home_placeholder);
  const away = sideLabel(match.away_team, match.away_placeholder);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div
      className={`card p-4 ${
        highlightLive && isLive ? "ring-2 ring-pitch" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span className="badge bg-pitch/10 text-pitch">
          {STAGE_SHORT[match.stage]}
          {match.group_letter ? ` · Grupo ${match.group_letter}` : ""}
        </span>
        {isLive ? (
          <span className="badge bg-danger/10 text-danger">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
            EN VIVO
          </span>
        ) : isFinished ? (
          <span className="badge bg-foreground/5 text-muted">Finalizado</span>
        ) : (
          <span>{formatKickoff(match.kickoff_at)}</span>
        )}
      </div>
      <div className="space-y-1">
        <TeamLine {...home} score={match.home_score} />
        <TeamLine {...away} score={match.away_score} />
      </div>
      {match.stadium && (
        <p className="mt-2 truncate text-xs text-muted">
          📍 {match.stadium.name}, {match.stadium.city}
        </p>
      )}
    </div>
  );
}
