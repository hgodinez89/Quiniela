-- ============================================================================
-- Migración 0012: posición/puntos del usuario por grupo en una fase concreta
-- (para mostrar en las cards del Home la posición en la fase actual).
-- ============================================================================

create or replace function public.get_my_phase_standing(p_stage match_stage)
returns table (
  group_id       uuid,
  phase_points   bigint,
  phase_position bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with phase_pts as (
    -- puntos de CADA miembro (para poder rankear) en los grupos del usuario
    select
      gm.group_id,
      gm.user_id,
      coalesce(sum(case
        when m.status = 'finished'
             and pr.home_score = m.home_score and pr.away_score = m.away_score then 3
        when m.status = 'finished'
             and sign(pr.home_score - pr.away_score) = sign(m.home_score - m.away_score) then 1
        when m.status = 'finished' and m.penalty_winner is not null
             and ((m.penalty_winner = 'home' and pr.home_score > pr.away_score)
               or (m.penalty_winner = 'away' and pr.away_score > pr.home_score)) then 1
        else 0 end), 0) as pts
    from public.group_members gm
    join public.group_members me
      on me.group_id = gm.group_id and me.user_id = auth.uid()
    left join public.predictions pr
      on pr.group_id = gm.group_id and pr.user_id = gm.user_id
    left join public.matches m on m.id = pr.match_id and m.stage = p_stage
    group by gm.group_id, gm.user_id
  ),
  ranked as (
    select
      group_id, user_id, pts,
      rank() over (partition by group_id order by pts desc) as pos
    from phase_pts
  )
  select group_id, pts, pos
  from ranked
  where user_id = auth.uid();
$$;

revoke all on function public.get_my_phase_standing(match_stage) from public;
grant execute on function public.get_my_phase_standing(match_stage) to authenticated;
