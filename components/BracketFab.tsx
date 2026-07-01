"use client";

import { useState } from "react";
import FullBracket from "@/components/FullBracket";
import type { BracketColumn } from "@/lib/bracket";
import type { MatchWithTeams } from "@/lib/types";

// Botón flotante + modal con el cuadro de eliminatorias (dentro del grupo).
export default function BracketFab({
  columns,
  third,
}: {
  columns: BracketColumn[];
  third: MatchWithTeams | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver cuadro de eliminatorias"
        title="Cuadro de eliminatorias"
        className="fixed bottom-20 right-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-accent text-foreground shadow-lg transition-transform hover:scale-105"
      >
        <span aria-hidden className="text-lg">🏆</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="card flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-bold">Cuadro de eliminatorias</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto p-3">
              <FullBracket columns={columns} third={third} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
