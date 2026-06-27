-- Post-match quality ratings: deterministic finishing, rating_request notifications,
-- double-blind ratings RLS, and pending-rating lookup RPC.

-- ---------------------------------------------------------------------------
-- 1. matches.finished_at
-- ---------------------------------------------------------------------------
alter table public.matches
  add column if not exists finished_at timestamptz;

comment on column public.matches.finished_at is
  'Set when status becomes finished; drives the 14-day standard rating window.';

-- ---------------------------------------------------------------------------
-- 2. notification_type: rating_request
-- ---------------------------------------------------------------------------
alter type public.notification_type add value if not exists 'rating_request';

-- ---------------------------------------------------------------------------
-- 3. Partial index for due-match finalizer
-- ---------------------------------------------------------------------------
create index if not exists idx_matches_active_due
  on public.matches (starts_at)
  where status in ('open', 'full', 'in_progress');

-- ---------------------------------------------------------------------------
-- 4. emit_rating_requests_for_match — fan-out rating_request to all members
-- ---------------------------------------------------------------------------
create or replace function public.emit_rating_requests_for_match(p_match_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_member_count int;
  v_member_id uuid;
begin
  select count(*) into v_member_count
  from (
    select m.host_id as profile_id
    from public.matches m
    where m.id = p_match_id
    union
    select mp.profile_id
    from public.match_participants mp
    where mp.match_id = p_match_id
      and mp.status = 'accepted'
  ) members;

  if v_member_count < 2 then
    return;
  end if;

  for v_member_id in
    select profile_id
    from (
      select m.host_id as profile_id
      from public.matches m
      where m.id = p_match_id
      union
      select mp.profile_id
      from public.match_participants mp
      where mp.match_id = p_match_id
        and mp.status = 'accepted'
    ) all_members
  loop
    perform public.emit_notification(
      v_member_id,
      null,
      'rating_request'::public.notification_type,
      p_match_id,
      null,
      '{}'::jsonb
    );
  end loop;
end;
$$;

revoke all on function public.emit_rating_requests_for_match(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. finalize_due_matches — set-based cron finalizer
-- ---------------------------------------------------------------------------
create or replace function public.finalize_due_matches()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_match record;
  v_count integer := 0;
begin
  for v_match in
    update public.matches
    set
      status = 'finished',
      finished_at = now()
    where status in ('open', 'full', 'in_progress')
      and starts_at + make_interval(mins => duration_minutes) <= now()
    returning id
  loop
    perform public.emit_rating_requests_for_match(v_match.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.finalize_due_matches()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. sync_match_lifecycle — stamp finished_at + emit rating_request on finish
-- ---------------------------------------------------------------------------
create or replace function public.sync_match_lifecycle(p_match_id uuid)
returns public.match_status
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_ends_at timestamptz;
  v_new_status public.match_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;

  if not (
    public.is_match_host(p_match_id)
    or public.has_match_relationship(p_match_id)
    or v_match.is_public
  ) then
    raise exception 'Not authorized to sync this match';
  end if;

  v_ends_at := v_match.starts_at + make_interval(mins => v_match.duration_minutes);
  v_new_status := v_match.status;

  if v_match.status in ('open', 'full') then
    if v_ends_at <= now() then
      v_new_status := 'finished';
    elsif v_match.starts_at <= now() then
      v_new_status := 'in_progress';
    end if;
  elsif v_match.status = 'in_progress' and v_ends_at <= now() then
    v_new_status := 'finished';
  end if;

  if v_new_status <> v_match.status then
    update public.matches
    set
      status = v_new_status,
      finished_at = case
        when v_new_status = 'finished' then now()
        else finished_at
      end
    where id = p_match_id;

    if v_new_status = 'finished' then
      perform public.emit_rating_requests_for_match(p_match_id);
    end if;
  end if;

  return v_new_status;
end;
$$;

revoke execute on function public.sync_match_lifecycle(uuid) from public, anon;
grant execute on function public.sync_match_lifecycle(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. validate_rating — 14-day window for standard ratings
-- ---------------------------------------------------------------------------
create or replace function public.validate_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
begin
  if new.context <> 'standard' then
    raise exception 'Only standard quality ratings are supported; use reliability_reports for penalties';
  end if;

  select * into v_match from public.matches where id = new.match_id;
  if not found then
    raise exception 'Match % does not exist', new.match_id;
  end if;

  if v_match.status <> 'finished' then
    raise exception 'Standard ratings are only allowed after the match is finished';
  end if;

  if v_match.finished_at is null then
    raise exception 'Match finish time is required for ratings';
  end if;

  if now() > v_match.finished_at + interval '14 days' then
    raise exception 'Rating window has expired';
  end if;

  if not public.is_match_member_of(new.match_id, new.rater_id)
     or not public.is_match_member_of(new.match_id, new.ratee_id) then
    raise exception 'Standard ratings require both rater and ratee to be match members';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Ratings RLS — double-blind (rater reads own rows only)
-- ---------------------------------------------------------------------------
drop policy if exists "Ratings are visible to authenticated users" on public.ratings;

create policy "Raters can read own ratings"
  on public.ratings for select
  to authenticated
  using (rater_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 9. get_pending_rating_matches — History hint + badge driver
-- ---------------------------------------------------------------------------
create or replace function public.get_pending_rating_matches()
returns table (
  match_id uuid,
  member_count integer,
  pending_count integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  with my_finished_matches as (
    select m.id
    from public.matches m
    where m.status = 'finished'
      and m.finished_at is not null
      and m.finished_at + interval '14 days' >= now()
      and public.is_match_member_of(m.id, v_user_id)
  ),
  match_members as (
    select
      mfm.id as match_id,
      member.profile_id
    from my_finished_matches mfm
    cross join lateral (
      select m.host_id as profile_id
      from public.matches m
      where m.id = mfm.id
      union
      select mp.profile_id
      from public.match_participants mp
      where mp.match_id = mfm.id
        and mp.status = 'accepted'
    ) member
  ),
  member_counts as (
    select mm.match_id, count(*)::integer as member_count
    from match_members mm
    group by mm.match_id
    having count(*) >= 2
  ),
  other_members as (
    select mm.match_id, mm.profile_id as ratee_id
    from match_members mm
    where mm.profile_id <> v_user_id
  ),
  unrated as (
    select om.match_id, count(*)::integer as pending_count
    from other_members om
    where not exists (
      select 1
      from public.ratings r
      where r.match_id = om.match_id
        and r.rater_id = v_user_id
        and r.ratee_id = om.ratee_id
        and r.context = 'standard'
    )
    group by om.match_id
    having count(*) > 0
  )
  select mc.match_id, mc.member_count, u.pending_count
  from member_counts mc
  inner join unrated u on u.match_id = mc.match_id;
end;
$$;

revoke all on function public.get_pending_rating_matches()
  from public, anon;
grant execute on function public.get_pending_rating_matches() to authenticated;
