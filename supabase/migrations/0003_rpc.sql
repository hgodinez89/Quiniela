-- ============================================================================
-- Migración 0003: RPCs (procedimientos server-side seguros).
-- ============================================================================

-- Al iniciar sesión, acepta automáticamente las invitaciones pendientes que
-- coinciden con el email del usuario (crea membresía y marca como aceptada).
create or replace function public.accept_my_invitations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  accepted_count integer;
begin
  insert into public.group_members (group_id, user_id, role)
  select gi.group_id, auth.uid(), 'member'
  from public.group_invitations gi
  where gi.invited_email = public.my_email()
    and gi.status = 'pending'
  on conflict (group_id, user_id) do nothing;

  with upd as (
    update public.group_invitations
    set status = 'accepted'
    where invited_email = public.my_email() and status = 'pending'
    returning 1
  )
  select count(*)::int into accepted_count from upd;

  return accepted_count;
end;
$$;

revoke all on function public.accept_my_invitations() from public;
grant execute on function public.accept_my_invitations() to authenticated;

-- Ranking de un grupo con puntos reales (no limitado por la visibilidad de
-- predicciones individuales). Autoriza por membresía: si el llamante no es
-- miembro del grupo, no devuelve filas.
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
    mp.user_id,
    p.display_name,
    p.avatar_url,
    mp.pts,
    mp.cnt,
    rank() over (order by mp.pts desc)
  from member_points mp
  join public.profiles p on p.id = mp.user_id
  where public.is_member(p_group)
  order by mp.pts desc;
$$;

revoke all on function public.get_group_ranking(uuid) from public;
grant execute on function public.get_group_ranking(uuid) to authenticated;

-- Grupos del usuario con su posición y puntos (para la Home).
create or replace function public.get_my_groups()
returns table (
  group_id      uuid,
  name          text,
  description   text,
  creator_id    uuid,
  members_count bigint,
  total_points  bigint,
  "position"    bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    bg.id,
    bg.name,
    bg.description,
    bg.creator_id,
    (select count(*) from public.group_members gm where gm.group_id = bg.id),
    coalesce(r.total_points, 0),
    r."position"
  from public.bet_groups bg
  join public.group_members me on me.group_id = bg.id and me.user_id = auth.uid()
  left join lateral (
    select gr.total_points, gr."position"
    from public.get_group_ranking(bg.id) gr
    where gr.user_id = auth.uid()
  ) r on true
  order by bg.created_at desc;
$$;

revoke all on function public.get_my_groups() from public;
grant execute on function public.get_my_groups() to authenticated;
