import { sideLabel, type MatchWithTeams, type Prediction } from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { predictionPoints } from "@/lib/scoring";

interface MemberInfo {
  display_name: string | null;
  avatar_url: string | null;
}

function PointsBadge({ pts }: { pts: number | null }) {
  if (pts == null) return null;
  const cls =
    pts === 3
      ? "bg-pitch text-white"
      : pts === 1
        ? "bg-accent/30 text-foreground"
        : "bg-foreground/5 text-muted";
  return <span className={`badge ${cls}`}>{pts} pts</span>;
}

export default function PhaseResults({
  matches,
  predictions,
  members,
  meId,
}: {
  matches: MatchWithTeams[];
  predictions: Prediction[];
  members: Record<string, MemberInfo>;
  meId: string;
}) {
  const byMatch = new Map<number, Prediction[]>();
  for (const p of predictions) {
    const arr = byMatch.get(p.match_id) ?? [];
    arr.push(p);
    byMatch.set(p.match_id, arr);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Enviaste esta fase. Aquí están los marcadores reales, tus puntos y las
        predicciones de los demás.
      </p>
      {matches.map((m) => {
        const home = sideLabel(m.home_team, m.home_placeholder);
        const away = sideLabel(m.away_team, m.away_placeholder);
        const preds = (byMatch.get(m.id) ?? []).slice().sort((a, b) => {
          const pa = predictionPoints(a, m) ?? -1;
          const pb = predictionPoints(b, m) ?? -1;
          return pb - pa;
        });
        return (
          <div key={m.id} className="card p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>
                {m.group_letter ? `Grupo ${m.group_letter} · ` : ""}
                {formatKickoff(m.kickoff_at)}
              </span>
              {m.status === "finished" ? (
                <span className="badge bg-foreground/5 text-muted">Final</span>
              ) : m.status === "live" ? (
                <span className="badge bg-danger/10 text-danger">EN VIVO</span>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-3 text-base font-semibold">
              <span className="flex items-center gap-1.5">
                {home.flag} {home.name}
              </span>
              <span className="tabular-nums">
                {m.status === "finished"
                  ? `${m.home_score} - ${m.away_score}`
                  : "vs"}
              </span>
              <span className="flex items-center gap-1.5">
                {away.name} {away.flag}
              </span>
            </div>

            <ul className="mt-3 divide-y divide-border border-t border-border">
              {preds.length === 0 && (
                <li className="py-2 text-center text-xs text-muted">
                  Nadie predijo este partido.
                </li>
              )}
              {preds.map((p) => {
                const info = members[p.user_id];
                const pts = predictionPoints(p, m);
                const isMe = p.user_id === meId;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-2 py-1.5 text-sm ${
                      isMe ? "font-medium" : ""
                    }`}
                  >
                    <span className="flex-1 truncate">
                      {info?.display_name || "Participante"}
                      {isMe && <span className="text-muted"> (tú)</span>}
                    </span>
                    <span className="tabular-nums text-muted">
                      {p.home_score} - {p.away_score}
                    </span>
                    <PointsBadge pts={pts} />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
