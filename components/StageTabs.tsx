import Link from "next/link";
import { STAGES, STAGE_SHORT, type Stage } from "@/lib/types";

export default function StageTabs({
  groupId,
  active,
}: {
  groupId: string;
  active: Stage;
}) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
      {STAGES.map((s) => (
        <Link
          key={s}
          href={`/groups/${groupId}?stage=${s}`}
          scroll={false}
          className={`chip-tab badge whitespace-nowrap px-3 py-1.5 ${
            s === active
              ? "bg-pitch text-white"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          {STAGE_SHORT[s]}
        </Link>
      ))}
    </div>
  );
}
