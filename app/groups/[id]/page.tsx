import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStageMatches } from "@/lib/matches";
import {
  STAGES,
  STAGE_LABEL,
  type BetGroup,
  type Prediction,
  type Profile,
  type Stage,
} from "@/lib/types";
import StageTabs from "@/components/StageTabs";
import RankingTable, { type RankingEntry } from "@/components/RankingTable";
import MembersList, { type MemberEntry } from "@/components/MembersList";
import InviteForm from "./InviteForm";
import PredictionPanel from "./PredictionPanel";
import PhaseResults from "./PhaseResults";
import DeleteGroupButton from "./DeleteGroupButton";
import ScrollFab from "@/components/ScrollFab";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const stage: Stage = STAGES.includes(sp.stage as Stage)
    ? (sp.stage as Stage)
    : "group";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Grupo (RLS: solo miembros/creador pueden verlo)
  const { data: groupData } = await supabase
    .from("bet_groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const group = groupData as BetGroup | null;
  if (!group) notFound();

  const isCreator = group.creator_id === user.id;

  // Miembros + perfiles (no hay FK directa group_members->profiles, se unen aquí)
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, role")
    .eq("group_id", id);
  const memberIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*")
    .in("id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"]);
  const profileMap = new Map<string, Profile>(
    (profilesData as Profile[] | null ?? []).map((p) => [p.id, p])
  );
  const members: MemberEntry[] = (memberRows ?? [])
    .map((m) => ({
      user_id: m.user_id,
      role: m.role as "admin" | "member",
      profile: profileMap.get(m.user_id) ?? null,
    }))
    .sort((a, b) => {
      if (a.user_id === group.creator_id) return -1;
      if (b.user_id === group.creator_id) return 1;
      return (a.profile?.display_name ?? "").localeCompare(
        b.profile?.display_name ?? ""
      );
    });

  // Ranking (RPC con puntos reales, autorizado por membresía)
  const { data: rankingData } = await supabase.rpc("get_group_ranking", {
    p_group: id,
  });
  const ranking = (rankingData ?? []) as RankingEntry[];

  // Partidos de la fase + predicciones
  const matches = await getStageMatches(supabase, stage);
  const matchIds = matches.map((m) => m.id);

  const { data: myPredData } = await supabase
    .from("predictions")
    .select("*")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .in("match_id", matchIds.length ? matchIds : [-1]);
  const myPreds = (myPredData ?? []) as Prediction[];

  const { data: submission } = await supabase
    .from("phase_submissions")
    .select("id")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .eq("stage", stage)
    .maybeSingle();
  const submitted = !!submission;

  // Draft inicial para el panel de predicción
  const initialDraft: Record<number, { home: string; away: string }> = {};
  for (const p of myPreds) {
    initialDraft[p.match_id] = {
      home: String(p.home_score),
      away: String(p.away_score),
    };
  }

  // Predicciones visibles (mías + ajenas si ya envié la fase) para resultados
  let visiblePreds: Prediction[] = myPreds;
  if (submitted) {
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .eq("group_id", id)
      .in("match_id", matchIds.length ? matchIds : [-1]);
    visiblePreds = (data ?? []) as Prediction[];
  }
  const memberInfo: Record<
    string,
    { display_name: string | null; avatar_url: string | null }
  > = {};
  for (const m of members) {
    memberInfo[m.user_id] = {
      display_name: m.profile?.display_name ?? null,
      avatar_url: m.profile?.avatar_url ?? null,
    };
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-pitch">
          ← Inicio
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          {group.name}
        </h1>
        {group.description && (
          <p className="mt-1 text-sm text-muted">{group.description}</p>
        )}
      </div>

      <RankingTable entries={ranking} meId={user.id} creatorId={group.creator_id} />

      <MembersList
        members={members}
        groupId={id}
        creatorId={group.creator_id}
        meId={user.id}
        canManage={isCreator}
      />

      {isCreator && <InviteForm groupId={id} />}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{STAGE_LABEL[stage]}</h2>
          {submitted && (
            <span className="badge bg-pitch/10 text-pitch">Fase enviada ✓</span>
          )}
        </div>
        <StageTabs groupId={id} active={stage} />

        {submitted ? (
          <PhaseResults
            matches={matches}
            predictions={visiblePreds}
            members={memberInfo}
            meId={user.id}
          />
        ) : (
          <PredictionPanel
            groupId={id}
            stage={stage}
            matches={matches}
            initial={initialDraft}
          />
        )}
      </section>

      {isCreator && (
        <DeleteGroupButton groupId={id} groupName={group.name} />
      )}

      <ScrollFab />
    </div>
  );
}
