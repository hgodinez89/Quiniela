-- ============================================================================
-- Migración 0008: ganadores por fase + campeón del torneo (derivados).
-- No cambia tablas; solo un RPC y una vista de lectura.
-- ============================================================================

-- Puntos por (fase, usuario) en un grupo, + aciertos exactos (desempate).
create or replace function public.get_group_phase_points(p_group uuid)
returns table (
  stage        match_stage,
  user_id      uuid,
  display_name text,
  avatar_url   text,
  points       bigint,
  exact_hits   bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    mt.stage,
    gm.user_id,
    p.display_name,
    p.avatar_url,
    coalesce(sum(case
      when mt.status = 'finished'
           and pr.home_score = mt.home_score and pr.away_score = mt.away_score then 3
      when mt.status = 'finished'
           and sign(pr.home_score - pr.away_score) = sign(mt.home_score - mt.away_score) then 1
      else 0 end), 0) as points,
    coalesce(sum(case
      when mt.status = 'finished'
           and pr.home_score = mt.home_score and pr.away_score = mt.away_score then 1
      else 0 end), 0) as exact_hits
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  join public.predictions pr on pr.group_id = gm.group_id and pr.user_id = gm.user_id
  join public.matches mt on mt.id = pr.match_id
  where gm.group_id = p_group and public.is_member(p_group)
  group by mt.stage, gm.user_id, p.display_name, p.avatar_url;
$$;

revoke all on function public.get_group_phase_points(uuid) from public;
grant execute on function public.get_group_phase_points(uuid) to authenticated;

-- Estado de cada fase del torneo (cuántos partidos hay y cuántos terminaron).
create or replace view public.v_phase_status as
  select
    stage,
    count(*)::int as total,
    count(*) filter (where status = 'finished')::int as finished
  from public.matches
  group by stage;

alter view public.v_phase_status set (security_invoker = on);
grant select on public.v_phase_status to authenticated;
