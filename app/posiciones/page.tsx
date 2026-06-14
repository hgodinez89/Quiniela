import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getStageMatches, getKnockoutMatches } from "@/lib/matches";
import { computeGroupStandings } from "@/lib/standings";
import { buildBracketColumns } from "@/lib/bracket";
import { STAGE_LABEL, type Stage } from "@/lib/types";
import StandingsTable from "@/components/StandingsTable";
import BracketMatchCard from "@/components/BracketMatchCard";
import FullBracket from "@/components/FullBracket";
import PhaseTabsNav from "@/components/PhaseTabsNav";
import ScrollFab from "@/components/ScrollFab";

const KNOCKOUT_TABS: Record<string, Stage> = {
  r32: "r32",
  r16: "r16",
  qf: "qf",
  sf: "sf",
  final: "final",
};

export default async function PosicionesPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const { fase = "grupos" } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-pitch">
          ← Inicio
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          Posiciones y llaves
        </h1>
        <p className="text-sm text-muted">
          Tablas del torneo y cuadro de eliminatorias (se actualizan con los
          marcadores).
        </p>
      </div>

      <PhaseTabsNav active={fase} />

      {fase === "grupos" && <GroupsView supabase={supabase} />}
      {fase in KNOCKOUT_TABS && (
        <KnockoutView supabase={supabase} stage={KNOCKOUT_TABS[fase]} />
      )}
      {fase === "llave" && <BracketView supabase={supabase} />}

      <ScrollFab />
    </div>
  );
}

async function GroupsView({ supabase }: { supabase: SupabaseClient }) {
  const matches = await getStageMatches(supabase, "group");
  const standings = computeGroupStandings(matches);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {standings.map((s) => (
        <StandingsTable key={s.group} data={s} />
      ))}
    </div>
  );
}

async function KnockoutView({
  supabase,
  stage,
}: {
  supabase: SupabaseClient;
  stage: Stage;
}) {
  const matches = await getStageMatches(supabase, stage);
  const third =
    stage === "final" ? await getStageMatches(supabase, "third") : [];
  const all = [...matches, ...third];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">{STAGE_LABEL[stage]}</h2>
      {all.length === 0 ? (
        <div className="card p-5 text-center text-sm text-muted">
          Esta fase aún no tiene partidos.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((m) => (
            <BracketMatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}

async function BracketView({ supabase }: { supabase: SupabaseClient }) {
  const ko = await getKnockoutMatches(supabase);
  const { columns, third } = buildBracketColumns(ko);
  return <FullBracket columns={columns} third={third} />;
}
