"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sideLabel,
  isKnockout,
  type MatchWithTeams,
  type Stage,
} from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { filterMatchesByQuery } from "@/lib/matchSearch";
import Flag from "@/components/Flag";
import MatchSearchBar from "@/components/MatchSearchBar";
import MatchSection from "@/components/MatchSection";
import { savePredictions, submitPhase } from "./actions";

type Draft = Record<number, { home: string; away: string }>;

export default function PredictionPanel({
  groupId,
  stage,
  matches,
  initial,
}: {
  groupId: string;
  stage: Stage;
  matches: MatchWithTeams[];
  initial: Draft;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // Instante de referencia estable durante el ciclo de vida del componente.
  const [now] = useState(() => Date.now());

  const knockout = isKnockout(stage);

  // Búsqueda compartida (solo afecta lo mostrado, no el % ni el envío)
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  const filtered = filterMatchesByQuery(matches, query);
  const ongoing = filtered.filter((m) => m.status !== "finished");
  const finishedList = filtered.filter((m) => m.status === "finished");

  function predictable(m: MatchWithTeams): boolean {
    const open = new Date(m.kickoff_at).getTime() > now;
    const teamsKnown =
      !knockout || (m.home_team_id != null && m.away_team_id != null);
    return open && teamsKnown;
  }

  const editable = matches.filter(predictable);
  const pendingTeams = matches.filter(
    (m) =>
      knockout &&
      new Date(m.kickoff_at).getTime() > now &&
      (m.home_team_id == null || m.away_team_id == null)
  ).length;

  const filledCount = editable.filter((m) => {
    const d = draft[m.id];
    return d && d.home !== "" && d.away !== "";
  }).length;

  const progress =
    editable.length === 0 ? 0 : Math.round((filledCount / editable.length) * 100);

  const canSubmit =
    editable.length > 0 && filledCount === editable.length && pendingTeams === 0;

  function setScore(id: number, side: "home" | "away", value: string) {
    const v = value.replace(/[^0-9]/g, "").slice(0, 2);
    setDraft((d) => ({
      ...d,
      [id]: { home: d[id]?.home ?? "", away: d[id]?.away ?? "", [side]: v },
    }));
  }

  function collect() {
    return editable
      .filter((m) => {
        const d = draft[m.id];
        return d && d.home !== "" && d.away !== "";
      })
      .map((m) => ({
        match_id: m.id,
        home_score: Number(draft[m.id].home),
        away_score: Number(draft[m.id].away),
      }));
  }

  function onSave() {
    startTransition(async () => {
      const res = await savePredictions(groupId, collect());
      setMsg({ ok: res.ok, text: res.error ?? res.message ?? "" });
      router.refresh();
    });
  }

  function onSubmit() {
    if (!canSubmit) return;
    if (!confirm("Una vez enviada no podrás editar esta fase. ¿Continuar?"))
      return;
    startTransition(async () => {
      const saved = await savePredictions(groupId, collect());
      if (!saved.ok) {
        setMsg({ ok: false, text: saved.error ?? "Error al guardar" });
        return;
      }
      const res = await submitPhase(groupId, stage);
      setMsg({ ok: res.ok, text: res.error ?? res.message ?? "" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Barra de progreso */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Tu avance en esta fase</span>
          <span className="tabular-nums text-muted">
            {filledCount}/{editable.length} · {progress}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-pitch transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {pendingTeams > 0 && (
          <p className="mt-2 text-xs text-muted">
            {pendingTeams} cruce(s) aún sin definir. Podrás enviar la fase cuando
            todos los equipos estén definidos.
          </p>
        )}
      </div>

      {/* Búsqueda */}
      {matches.length > 1 && (
        <MatchSearchBar value={query} onChange={setQuery} />
      )}

      {/* Resumen */}
      <p className="text-sm text-muted">
        Total: {filtered.length} partido{filtered.length === 1 ? "" : "s"} ·{" "}
        {ongoing.length} en curso/por jugar · {finishedList.length} finalizados
      </p>

      {/* Paneles */}
      {(() => {
        const renderRow = (m: MatchWithTeams) => (
          <MatchPredictRow
            key={m.id}
            match={m}
            editable={predictable(m)}
            draft={draft[m.id]}
            onChange={setScore}
            now={now}
          />
        );
        return (
          <>
            <MatchSection
              title="⏳ En curso o por jugar"
              matches={ongoing}
              defaultOpen
              searching={searching}
              gridCols={knockout}
              renderItem={renderRow}
            />
            <MatchSection
              title="✅ Finalizados"
              matches={finishedList}
              defaultOpen={false}
              searching={searching}
              gridCols={knockout}
              renderItem={renderRow}
            />
          </>
        );
      })()}
      {searching && filtered.length === 0 && (
        <p className="card p-4 text-center text-sm text-muted">
          Ningún partido coincide con la búsqueda.
        </p>
      )}

      {/* Acciones */}
      <div className="sticky bottom-3 z-10">
        <div className="card flex flex-wrap items-center gap-3 p-3">
          <button className="btn-outline" onClick={onSave} disabled={pending}>
            {pending ? "Guardando…" : "Guardar progreso"}
          </button>
          <button
            className="btn-primary"
            onClick={onSubmit}
            disabled={pending || !canSubmit}
            title={!canSubmit ? "Completa todas las predicciones para enviar" : ""}
          >
            Enviar fase completa
          </button>
          {msg && (
            <span
              className={`text-sm ${msg.ok ? "text-pitch" : "text-danger"}`}
            >
              {msg.ok ? "✓ " : ""}
              {msg.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchPredictRow({
  match,
  editable,
  draft,
  onChange,
  now,
}: {
  match: MatchWithTeams;
  editable: boolean;
  draft?: { home: string; away: string };
  onChange: (id: number, side: "home" | "away", value: string) => void;
  now: number;
}) {
  const home = sideLabel(match.home_team, match.home_placeholder);
  const away = sideLabel(match.away_team, match.away_placeholder);
  const started = new Date(match.kickoff_at).getTime() <= now;
  const hasDraft = draft && (draft.home !== "" || draft.away !== "");

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>
          {match.group_letter ? `Grupo ${match.group_letter} · ` : ""}
          {formatKickoff(match.kickoff_at)}
        </span>
        {match.status === "finished" && (
          <span className="badge bg-foreground/5 text-muted">Jugado</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Flag code={home.code} emoji={home.flag} name={home.name} />
          <span
            className={
              home.known
                ? "truncate text-sm"
                : "text-xs italic leading-tight text-muted [overflow-wrap:anywhere]"
            }
          >
            {home.name}
          </span>
        </span>

        {editable ? (
          <div className="flex items-center gap-1">
            <input
              inputMode="numeric"
              className="score-box"
              value={draft?.home ?? ""}
              onChange={(e) => onChange(match.id, "home", e.target.value)}
              aria-label={`Goles ${home.name}`}
            />
            <span className="text-muted">-</span>
            <input
              inputMode="numeric"
              className="score-box"
              value={draft?.away ?? ""}
              onChange={(e) => onChange(match.id, "away", e.target.value)}
              aria-label={`Goles ${away.name}`}
            />
          </div>
        ) : match.status === "finished" ? (
          <span className="px-2 text-lg font-bold tabular-nums">
            {match.home_score}-{match.away_score}
          </span>
        ) : (
          <span className="px-2 text-xs text-muted">
            {started ? "Cerrado" : "Por definir"}
          </span>
        )}

        <span className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span
            className={
              away.known
                ? "truncate text-sm"
                : "text-xs italic leading-tight text-muted [overflow-wrap:anywhere]"
            }
          >
            {away.name}
          </span>
          <Flag code={away.code} emoji={away.flag} name={away.name} />
        </span>
      </div>

      {!editable && match.status === "finished" && !hasDraft && (
        <p className="mt-2 text-center text-xs text-muted">
          ⚠️ Partido ya jugado y no predicho por ti
        </p>
      )}
    </div>
  );
}
