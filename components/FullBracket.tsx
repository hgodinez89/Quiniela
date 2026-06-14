"use client";

import { useState } from "react";
import { STAGE_SHORT, type MatchWithTeams } from "@/lib/types";
import type { BracketColumn } from "@/lib/bracket";
import BracketMatchCard from "@/components/BracketMatchCard";

export default function FullBracket({
  columns,
  third,
}: {
  columns: BracketColumn[];
  third: MatchWithTeams | null;
}) {
  const [zoom, setZoom] = useState(1);
  const clamp = (z: number) => Math.min(1.5, Math.max(0.5, Math.round(z * 10) / 10));

  if (columns.length === 0) {
    return (
      <div className="card p-5 text-center text-sm text-muted">
        La llave aún no está disponible.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1">
        <button
          aria-label="Alejar"
          className="btn-outline h-8 w-8 p-0"
          onClick={() => setZoom((z) => clamp(z - 0.1))}
        >
          −
        </button>
        <button
          className="btn-outline h-8 px-2 text-xs tabular-nums"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          aria-label="Acercar"
          className="btn-outline h-8 w-8 p-0"
          onClick={() => setZoom((z) => clamp(z + 0.1))}
        >
          +
        </button>
      </div>

      <div
        className="overflow-auto rounded-xl border border-border bg-surface p-3"
        style={{ maxHeight: "75vh" }}
      >
        <div
          className="inline-block origin-top-left transition-transform"
          style={{ transform: `scale(${zoom})` }}
        >
          <div className="flex items-stretch gap-4">
            {columns.map((col, i) => (
              <div key={i} className="flex w-44 shrink-0 flex-col">
                <h3 className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-muted">
                  {STAGE_SHORT[col.stage]}
                </h3>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {col.matches.map((m) => (
                    <BracketMatchCard key={m.id} match={m} />
                  ))}
                </div>
                {col.stage === "final" && third && (
                  <div className="mt-6">
                    <h3 className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-muted">
                      3er lugar
                    </h3>
                    <BracketMatchCard match={third} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
