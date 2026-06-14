"use client";

import { useMemo, useState } from "react";
import { filterMatchesByQuery } from "@/lib/matchSearch";
import type { MatchWithTeams } from "@/lib/types";

// Búsqueda + "ver más" incremental sobre una lista de partidos (solo display).
export function useSearchPaginate(matches: MatchWithTeams[], pageSize = 25) {
  const [query, setQueryState] = useState("");
  const [count, setCount] = useState(pageSize);

  const setQuery = (q: string) => {
    setQueryState(q);
    setCount(pageSize); // al cambiar la búsqueda, volver a 25
  };

  const filtered = useMemo(
    () => filterMatchesByQuery(matches, query),
    [matches, query]
  );

  const total = filtered.length;
  const visible = filtered.slice(0, count);
  const shownCount = Math.min(count, total);
  const canShowMore = count < total;
  const nextStep = Math.min(pageSize, total - count);

  return {
    query,
    setQuery,
    visible,
    total,
    shownCount,
    canShowMore,
    nextStep,
    showMore: () => setCount((c) => c + pageSize),
  };
}
