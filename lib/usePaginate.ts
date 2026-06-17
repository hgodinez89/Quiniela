"use client";

import { useState } from "react";

// Paginación incremental ("ver más") sobre una lista ya filtrada.
export function usePaginate<T>(items: T[], pageSize = 25) {
  const [count, setCount] = useState(pageSize);
  // Reset al cambiar el tamaño de la lista (p. ej. al filtrar) — patrón
  // "ajustar estado durante el render" (sin efecto).
  const [prevLen, setPrevLen] = useState(items.length);
  if (prevLen !== items.length) {
    setPrevLen(items.length);
    setCount(pageSize);
  }

  const total = items.length;
  const visible = items.slice(0, count);
  const shownCount = Math.min(count, total);
  const nextStep = Math.min(pageSize, total - count);

  return {
    visible,
    total,
    shownCount,
    nextStep,
    showMore: () => setCount((c) => c + pageSize),
  };
}
