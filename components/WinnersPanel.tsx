import { STAGE_LABEL, STAGES } from "@/lib/types";
import type { PhaseWinner, WinnerEntry } from "@/lib/winners";
import CollapsibleCard from "@/components/CollapsibleCard";

export interface BannerData {
  icon: string;
  label: string;
  names: string | null; // null/"" => estado vacío ("se definirá…")
  points: number;
  emphasize?: boolean; // resalta (ring) para campeón/ganador de fase
  emptyText?: string;
}

function Avatar({ w }: { w: WinnerEntry }) {
  const name = w.display_name || "?";
  if (w.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={w.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
    );
  }
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-pitch/15 text-xs font-bold text-pitch">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function names(winners: WinnerEntry[]): string {
  return winners.map((w) => w.display_name || "Sin nombre").join(", ");
}

export function ChampionBanner({ data }: { data: BannerData }) {
  if (!data.names) {
    return (
      <div className="card p-4 text-center text-sm text-muted">
        {data.icon}{" "}
        {data.emptyText ?? "Se definirá conforme avancen los resultados."}
      </div>
    );
  }
  return (
    <div
      className={`card overflow-hidden p-4 ${
        data.emphasize ? "ring-2 ring-accent" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-3xl">
          {data.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-muted">
            {data.label}
          </div>
          <div className="truncate text-lg font-extrabold">{data.names}</div>
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-bold tabular-nums">
            {data.points}
          </span>
          <span className="block text-[11px] text-muted">pts</span>
        </span>
      </div>
    </div>
  );
}

export function PhaseWinnersPanel({ phases }: { phases: PhaseWinner[] }) {
  const byStage = new Map(phases.map((p) => [p.stage, p]));
  return (
    <CollapsibleCard title="Ganadores por fase">
      <ul className="divide-y divide-border">
        {STAGES.map((stage) => {
          const p = byStage.get(stage);
          return (
            <li
              key={stage}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="text-muted">{STAGE_LABEL[stage]}</span>
              <span className="flex min-w-0 items-center gap-2 text-right">
                {renderPhaseResult(p)}
              </span>
            </li>
          );
        })}
      </ul>
    </CollapsibleCard>
  );
}

function renderPhaseResult(p?: PhaseWinner) {
  if (!p || p.state === "not_started") {
    return <span className="text-muted">— Aún no inicia</span>;
  }
  if (p.winners.length === 0) {
    return (
      <span className="text-muted">
        {p.state === "complete" ? "Sin aciertos" : "⏳ En curso"}
      </span>
    );
  }
  const isComplete = p.state === "complete";
  return (
    <>
      <span aria-hidden>{isComplete ? "🏅" : "⏳"}</span>
      <Avatar w={p.winners[0]} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{names(p.winners)}</span>
        <span className="block text-[11px] text-muted">
          {isComplete ? `${p.points} pts` : `líder · ${p.points} pts`}
        </span>
      </span>
    </>
  );
}
