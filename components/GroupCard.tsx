import Link from "next/link";
import { truncate, ordinal } from "@/lib/format";

export interface MyGroup {
  group_id: string;
  name: string;
  description: string | null;
  creator_id: string;
  members_count: number;
  total_points: number;
  position: number | null;
}

export default function GroupCard({
  group,
  phaseShort,
  phasePoints,
  phasePosition,
}: {
  group: MyGroup;
  phaseShort: string;
  phasePoints: number;
  phasePosition: number | null;
}) {
  return (
    <Link
      href={`/groups/${group.group_id}`}
      className="card flex flex-col justify-between p-4 transition-shadow hover:shadow-md"
    >
      <div>
        <h3 className="font-bold leading-tight">{group.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {truncate(group.description, 90) || "Sin descripción"}
        </p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2 text-sm">
        <span className="text-muted">{group.members_count} participantes</span>
        <span className="flex flex-col items-end gap-1">
          <span className="badge bg-accent/20 text-foreground">
            🏆 Torneo ·{" "}
            {group.total_points > 0 && group.position
              ? `${ordinal(group.position)} · ${group.total_points} pts`
              : "sin ranking"}
          </span>
          <span className="badge bg-pitch/10 text-pitch">
            🎯 {phaseShort} ·{" "}
            {phasePoints > 0 && phasePosition
              ? `${ordinal(phasePosition)} · ${phasePoints} pts`
              : `— · ${phasePoints} pts`}
          </span>
        </span>
      </div>
    </Link>
  );
}
