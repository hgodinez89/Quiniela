import { sideLabel, type MatchWithTeams } from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { matchNum, winnerIsHome } from "@/lib/bracket";
import Flag from "@/components/Flag";

function Side({
  label,
  score,
  win,
}: {
  label: { name: string; flag: string | null; code: string | null; known: boolean };
  score: number | null;
  win: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${win ? "font-bold" : ""}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <Flag code={label.code} emoji={label.flag} name={label.name} />
        <span
          className={`text-sm ${
            label.known ? "truncate" : "whitespace-nowrap pr-0.5 italic text-muted"
          }`}
        >
          {label.name}
        </span>
      </span>
      {score != null && <span className="shrink-0 tabular-nums text-sm">{score}</span>}
    </div>
  );
}

export default function BracketMatchCard({ match }: { match: MatchWithTeams }) {
  const home = sideLabel(match.home_team, match.home_placeholder);
  const away = sideLabel(match.away_team, match.away_placeholder);
  const finished = match.status === "finished";
  const wh = winnerIsHome(match);
  const num = matchNum(match);

  return (
    <div className="card w-full p-2">
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
        <span>{formatKickoff(match.kickoff_at)}</span>
        {num != null && <span>P{num}</span>}
      </div>
      <div className="space-y-1">
        <Side label={home} score={finished ? match.home_score : null} win={wh === true} />
        <Side label={away} score={finished ? match.away_score : null} win={wh === false} />
      </div>
      {match.penalty_winner && (
        <p className="mt-1 text-center text-[10px] text-muted">
          {match.pen_home != null && match.pen_away != null
            ? `(pen ${
                match.penalty_winner === "home" ? match.pen_home : match.pen_away
              }-${
                match.penalty_winner === "home" ? match.pen_away : match.pen_home
              })`
            : "(pen)"}
        </p>
      )}
    </div>
  );
}
