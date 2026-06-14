import Flag from "@/components/Flag";
import type { GroupStandings } from "@/lib/standings";

const COLS = ["PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"] as const;

// Abreviaturas para nombres largos (por código). El resto usa el nombre completo.
const SHORT: Record<string, string> = {
  BIH: "Bosnia",
  USA: "EE.UU.",
  KSA: "Arabia S.",
  NZL: "N. Zelanda",
  NED: "P. Bajos",
  CIV: "C. Marfil",
  COD: "RD Congo",
  KOR: "Corea",
  CPV: "C. Verde",
};

export default function StandingsTable({ data }: { data: GroupStandings }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-sm font-bold">
        Grupo {data.group}
      </div>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-[11px] text-muted">
            <th className="py-2 pl-3 text-left font-medium">Equipo</th>
            {COLS.map((c) => (
              <th key={c} className="w-7 px-0 py-2 text-center font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => {
            const qualifies = i < 2;
            const short = SHORT[r.team.code] ?? r.team.name;
            return (
              <tr
                key={r.team.id}
                className={`border-t border-border ${qualifies ? "bg-pitch/5" : ""}`}
              >
                <td className="py-2 pl-3">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-3 shrink-0 text-center text-[11px] tabular-nums ${
                        qualifies ? "font-bold text-pitch" : "text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <Flag code={r.team.code} emoji={r.team.flag_emoji} name={r.team.name} />
                    {/* Móvil: código de 3 letras; escritorio: nombre abreviado */}
                    <span className="font-medium sm:hidden">{r.team.code}</span>
                    <span className="hidden truncate sm:inline">{short}</span>
                  </span>
                </td>
                <td className="px-0 py-2 text-center tabular-nums">{r.pj}</td>
                <td className="px-0 py-2 text-center tabular-nums">{r.g}</td>
                <td className="px-0 py-2 text-center tabular-nums">{r.e}</td>
                <td className="px-0 py-2 text-center tabular-nums">{r.p}</td>
                <td className="px-0 py-2 text-center tabular-nums">{r.gf}</td>
                <td className="px-0 py-2 text-center tabular-nums">{r.gc}</td>
                <td className="px-0 py-2 text-center tabular-nums">{r.dg}</td>
                <td className="px-0 py-2 text-center font-bold tabular-nums">
                  {r.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
