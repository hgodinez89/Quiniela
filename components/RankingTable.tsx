import { ordinal } from "@/lib/format";
import CollapsibleCard from "@/components/CollapsibleCard";

export interface RankingEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  predicted_count: number;
  position: number;
}

export default function RankingTable({
  entries,
  meId,
  creatorId,
}: {
  entries: RankingEntry[];
  meId: string;
  creatorId: string;
}) {
  // Orden: más puntos primero; en empate (incluidos los de 0), alfabético.
  const sorted = [...entries].sort(
    (a, b) =>
      b.total_points - a.total_points ||
      (a.display_name ?? "").localeCompare(b.display_name ?? "", "es", {
        sensitivity: "base",
      })
  );
  const allZero = entries.length > 0 && entries.every((e) => e.total_points === 0);

  return (
    <CollapsibleCard
      title="Ranking del grupo"
      defaultOpen
      right={allZero ? "Sin puntos aún" : undefined}
    >
      <ul className="divide-y divide-border">
        {sorted.map((e) => {
          const isMe = e.user_id === meId;
          return (
            <li
              key={e.user_id}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                isMe ? "bg-pitch/5" : ""
              }`}
            >
              <span className="w-7 text-center text-sm font-bold tabular-nums text-muted">
                {e.total_points === 0 ? "—" : ordinal(e.position)}
              </span>
              {e.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-pitch/15 text-xs font-bold text-pitch">
                  {(e.display_name || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="flex-1 truncate text-sm">
                {e.display_name || "Sin nombre"}
                {isMe && <span className="text-muted"> (tú)</span>}
                {e.user_id === creatorId && (
                  <span className="badge ml-2 bg-accent/20 text-[10px] text-foreground">
                    Admin
                  </span>
                )}
              </span>
              <span className="text-right">
                <span className="block text-sm font-bold tabular-nums">
                  {e.total_points} pts
                </span>
                <span className="block text-[11px] text-muted">
                  {e.predicted_count} predich.
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </CollapsibleCard>
  );
}
