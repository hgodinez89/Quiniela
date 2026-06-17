"use client";

import { useState, type ReactNode } from "react";
import { usePaginate } from "@/lib/usePaginate";
import ShowMoreButton from "@/components/ShowMoreButton";
import type { MatchWithTeams } from "@/lib/types";

// Panel colapsable de partidos, búsqueda-aware, con paginación propia.
export default function MatchSection({
  title,
  matches,
  defaultOpen,
  searching,
  pageSize = 25,
  gridCols = false,
  renderItem,
}: {
  title: string;
  matches: MatchWithTeams[];
  defaultOpen: boolean;
  searching: boolean;
  pageSize?: number;
  gridCols?: boolean;
  renderItem: (m: MatchWithTeams) => ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { visible, total, shownCount, nextStep, showMore } = usePaginate(
    matches,
    pageSize
  );

  // Al buscar → forzar abierto; al limpiar la búsqueda → volver al estado por
  // defecto. Patrón "ajustar estado durante el render" (sin efecto).
  const [prevSearching, setPrevSearching] = useState(searching);
  if (prevSearching !== searching) {
    setPrevSearching(searching);
    setOpen(searching ? true : defaultOpen);
  }

  if (matches.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-background"
      >
        <span>
          {title} ({total})
        </span>
        <span aria-hidden className="text-muted">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <div className={gridCols ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
            {visible.map((m) => renderItem(m))}
          </div>
          <ShowMoreButton
            total={total}
            shownCount={shownCount}
            nextStep={nextStep}
            onMore={showMore}
          />
        </div>
      )}
    </div>
  );
}
