import Link from "next/link";

const TABS = [
  { key: "grupos", label: "Grupos" },
  { key: "r32", label: "16vos" },
  { key: "r16", label: "8vos" },
  { key: "qf", label: "4tos" },
  { key: "sf", label: "Semis" },
  { key: "final", label: "Final" },
  { key: "llave", label: "Llave" },
];

export default function PhaseTabsNav({ active }: { active: string }) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/posiciones?fase=${t.key}`}
          scroll={false}
          className={`chip-tab badge whitespace-nowrap px-3 py-1.5 ${
            t.key === active
              ? "bg-pitch text-white"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
