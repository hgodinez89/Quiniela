import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLiveAndUpcoming } from "@/lib/matches";
import { currentStage } from "@/lib/ranking";
import { STAGE_SHORT } from "@/lib/types";
import type { PhaseStatusRow } from "@/lib/winners";
import LiveMatchBanner from "@/components/LiveMatchBanner";
import MatchCard from "@/components/MatchCard";
import GroupCard, { type MyGroup } from "@/components/GroupCard";

interface PhaseStanding {
  group_id: string;
  phase_points: number;
  phase_position: number;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Aceptar invitaciones pendientes al visitar (idempotente).
  await supabase.rpc("accept_my_invitations");

  const { currents, currentsAreLive, upcoming } = await getLiveAndUpcoming(
    supabase,
    6
  );
  const { data: groupsData } = await supabase.rpc("get_my_groups");
  const groups = (groupsData ?? []) as MyGroup[];

  // Fase actual + posición del usuario en esa fase por grupo
  const { data: phaseStatusData } = await supabase
    .from("v_phase_status")
    .select("*");
  const stage = currentStage((phaseStatusData ?? []) as PhaseStatusRow[]);
  const { data: standingData } = await supabase.rpc("get_my_phase_standing", {
    p_stage: stage,
  });
  const standingByGroup = new Map(
    ((standingData ?? []) as PhaseStanding[]).map((s) => [s.group_id, s])
  );
  const stageShort = STAGE_SHORT[stage];

  return (
    <div className="space-y-8">
      <LiveMatchBanner initial={currents} initialIsLive={currentsAreLive} />

      <Link
        href="/posiciones"
        className="card flex items-center justify-between p-4 transition-colors hover:bg-pitch/5"
      >
        <span className="flex items-center gap-3">
          <span aria-hidden className="text-2xl">📊</span>
          <span>
            <span className="block font-bold">Posiciones y llaves</span>
            <span className="block text-sm text-muted">
              Tablas por grupo y cuadro de eliminatorias
            </span>
          </span>
        </span>
        <span aria-hidden className="text-muted">›</span>
      </Link>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Próximos partidos
        </h2>
        {upcoming.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            No hay próximos partidos programados.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Mis grupos de quiniela
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const st = standingByGroup.get(g.group_id);
            return (
              <GroupCard
                key={g.group_id}
                group={g}
                phaseShort={stageShort}
                phasePoints={st?.phase_points ?? 0}
                phasePosition={st?.phase_position ?? null}
              />
            );
          })}
          <Link
            href="/groups/new"
            className="card grid min-h-[7rem] place-items-center border-2 border-dashed border-border p-4 text-center text-sm font-semibold text-pitch transition-colors hover:bg-pitch/5"
          >
            <span>
              <span className="block text-2xl">＋</span>
              Crear nuevo grupo
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
