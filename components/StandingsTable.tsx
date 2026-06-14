import Flag from "@/components/Flag";
import type { GroupStandings } from "@/lib/standings";

const COLS = ["PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"] as const;

export default function StandingsTable({ data }: { data: GroupStandings }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-sm font-bold">
        Grupo {data.group}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="px-3 py-2 text-left font-medium" colSpan={2}>
                Equipo
              </th>
              {COLS.map((c) => (
                <th key={c} className="px-2 py-2 text-center font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => {
              const qualifies = i < 2;
              return (
                <tr
                  key={r.team.id}
                  className={`border-t border-border ${qualifies ? "bg-pitch/5" : ""}`}
                >
                  <td className="w-6 px-2 py-2 text-center text-xs text-muted">
                    <span
                      className={`inline-block w-1.5 ${qualifies ? "text-pitch" : "text-transparent"}`}
                    >
                      ▎
                    </span>
                    {i + 1}
                  </td>
                  <td className="px-1 py-2">
                    <span className="flex items-center gap-2">
                      <Flag code={r.team.code} emoji={r.team.flag_emoji} name={r.team.name} />
                      <span className="truncate">{r.team.name}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.pj}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.g}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.e}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.p}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.gf}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.gc}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.dg}</td>
                  <td className="px-2 py-2 text-center font-bold tabular-nums">
                    {r.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
