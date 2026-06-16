"use client";

import { useState, type ReactNode } from "react";

// Tarjeta con encabezado que colapsa/expande su contenido.
export default function CollapsibleCard({
  title,
  defaultOpen = false,
  right,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold hover:bg-background"
      >
        <span>{title}</span>
        <span className="flex items-center gap-2">
          {right && (
            <span className="text-xs font-normal text-muted">{right}</span>
          )}
          <span aria-hidden className="text-muted">
            {open ? "▾" : "▸"}
          </span>
        </span>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
