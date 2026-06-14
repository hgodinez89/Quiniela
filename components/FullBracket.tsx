"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STAGE_SHORT, type MatchWithTeams } from "@/lib/types";
import { type BracketColumn, feederNums, matchNum } from "@/lib/bracket";
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

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  const [lines, setLines] = useState<string[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Calcula los paths (codos) midiendo la posición de cada tarjeta en el lienzo.
  const recompute = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paths: string[] = [];
    for (const col of columns) {
      for (const m of col.matches) {
        const pnum = matchNum(m);
        if (pnum == null) continue;
        const parent = cardRefs.current.get(pnum);
        if (!parent) continue;
        const px = parent.offsetLeft;
        const py = parent.offsetTop + parent.offsetHeight / 2;
        for (const fn of feederNums(m)) {
          const feeder = cardRefs.current.get(fn);
          if (!feeder) continue;
          const fx = feeder.offsetLeft + feeder.offsetWidth;
          const fy = feeder.offsetTop + feeder.offsetHeight / 2;
          const xMid = (fx + px) / 2;
          paths.push(`M ${fx} ${fy} H ${xMid} V ${py} H ${px}`);
        }
      }
    }
    setSize({ w: canvas.scrollWidth, h: canvas.scrollHeight });
    setLines(paths);
  }, [columns]);

  useEffect(() => {
    recompute();
    const canvas = canvasRef.current;
    let ro: ResizeObserver | null = null;
    if (canvas && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => recompute());
      ro.observe(canvas);
    }
    window.addEventListener("resize", recompute);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  if (columns.length === 0) {
    return (
      <div className="card p-5 text-center text-sm text-muted">
        La llave aún no está disponible.
      </div>
    );
  }

  const setCardRef = (num: number) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(num, el);
    else cardRefs.current.delete(num);
  };

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
          ref={canvasRef}
          className="relative inline-block origin-top-left transition-transform"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Líneas conectoras (detrás de las tarjetas) */}
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={size.w}
            height={size.h}
            style={{ overflow: "visible" }}
          >
            {lines.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                style={{ stroke: "var(--muted)", strokeOpacity: 0.45 }}
                strokeWidth={2}
              />
            ))}
          </svg>

          <div className="relative z-10 flex items-stretch gap-4">
            {columns.map((col, ci) => (
              <div key={ci} className="flex w-44 shrink-0 flex-col">
                <h3 className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-muted">
                  {STAGE_SHORT[col.stage]}
                </h3>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {col.matches.map((m) => {
                    const num = matchNum(m);
                    return (
                      <div
                        key={m.id}
                        ref={num != null ? setCardRef(num) : undefined}
                      >
                        <BracketMatchCard match={m} />
                      </div>
                    );
                  })}
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
