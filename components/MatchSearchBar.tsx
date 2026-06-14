"use client";

export default function MatchSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        🔎
      </span>
      <input
        className="input pl-9"
        placeholder="Buscar partido (ej. México, México vs Sudáfrica)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
        >
          ✕
        </button>
      )}
    </div>
  );
}
