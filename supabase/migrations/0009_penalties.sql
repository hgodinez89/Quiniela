-- ============================================================================
-- Migración 0009: soporte de penales en el puntaje.
-- En knockout, si el tiempo reglamentario+extra termina empatado y se define por
-- penales, además de la regla normal (contra el empate del campo) se otorga 1 pt
-- a quien predijo al GANADOR de la tanda. penalty_winner: 'home' | 'away' | null.
-- ============================================================================

alter table public.matches add column if not exists penalty_winner text;

-- Ranking acumulado del grupo (con ajuste de penales).
create or replace function public.get_group_ranking(p_group uuid)
returns table (
  user_id         uuid,
  display_name    text,
  avatar_url      text,
  total_points    bigint,
  predicted_count bigint,
  "position"      bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with member_points as (
    select
      gm.user_id,
      coalesce(sum(case
        when m.status = 'finished'
             and pr.home_score = m.home_score and pr.away_score = m.away_score then 3
        when m.status = 'finished'
             and sign(pr.home_score - pr.away_score) = sign(m.home_score - m.away_score) then 1
        when m.status = 'finished' and m.penalty_winner is not null
             and ((m.penalty_winner = 'home' and pr.home_score > pr.away_score)
               or (m.penalty_winner = 'away' and pr.away_score > pr.home_score)) then 1
        else 0 end), 0) as pts,
      count(pr.id) as cnt
    from public.group_members gm
    left join public.predictions pr
      on pr.group_id = gm.group_id and pr.user_id = gm.user_id
    left join public.matches m on m.id = pr.match_id
    where gm.group_id = p_group
    group by gm.user_id
  )
  select
    mp.user_id, p.display_name, p.avatar_url, mp.pts, mp.cnt,
    rank() over (order by mp.pts desc)
  from member_points mp
  join public.profiles p on p.id = mp.user_id
  where public.is_member(p_group)
  order by mp.pts desc;
$$;

revoke all on function public.get_group_ranking(uuid) from public;
grant execute on function public.get_group_ranking(uuid) to authenticated;

-- Puntos por (fase, usuario) (con ajuste de penales). exact_hits no cambia.
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
      when mt.status = 'finished' and mt.penalty_winner is not null
           and ((mt.penalty_winner = 'home' and pr.home_score > pr.away_score)
             or (mt.penalty_winner = 'away' and pr.away_score > pr.home_score)) then 1
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
