-- Block severance: cancel pending requests, remove shared upcoming roster ties,
-- close accept-after-block hole, and hide blocked users from discovery feeds.

-- ---------------------------------------------------------------------------
-- 1. sever_shared_upcoming_matches — route severance through participant UPDATE
--    so trg_participant_status_change, reliability, and notifications fire normally.
-- ---------------------------------------------------------------------------
create or replace function public.sever_shared_upcoming_matches(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_a is null or p_b is null or p_a = p_b then
    return;
  end if;

  -- Cancel pending join requests between the pair (either host direction).
  delete from public.match_participants mp
  using public.matches m
  where mp.match_id = m.id
    and mp.status = 'pending'
    and m.status in ('open', 'full')
    and m.starts_at > now()
    and (
      (m.host_id = p_a and mp.profile_id = p_b)
      or (m.host_id = p_b and mp.profile_id = p_a)
    );

  -- Host removes accepted blocked player from upcoming matches.
  update public.match_participants mp
  set status = 'removed'
  from public.matches m
  where mp.match_id = m.id
    and mp.status = 'accepted'
    and m.host_id = p_a
    and mp.profile_id = p_b
    and m.status in ('open', 'full')
    and m.starts_at > now();

  -- Blocker withdraws when the blocked user is host.
  update public.match_participants mp
  set status = 'withdrawn'
  from public.matches m
  where mp.match_id = m.id
    and mp.status = 'accepted'
    and m.host_id = p_b
    and mp.profile_id = p_a
    and m.status in ('open', 'full')
    and m.starts_at > now();

  -- Co-participants in a third-party match: blocker withdraws only (never evicts others).
  update public.match_participants mp
  set status = 'withdrawn'
  from public.matches m
  where mp.match_id = m.id
    and mp.status = 'accepted'
    and mp.profile_id = p_a
    and m.host_id not in (p_a, p_b)
    and m.status in ('open', 'full')
    and m.starts_at > now()
    and exists (
      select 1
      from public.match_participants mp2
      where mp2.match_id = m.id
        and mp2.profile_id = p_b
        and mp2.status = 'accepted'
    );
end;
$$;

revoke all on function public.sever_shared_upcoming_matches(uuid, uuid) from public, anon;
grant execute on function public.sever_shared_upcoming_matches(uuid, uuid) to authenticated;

comment on function public.sever_shared_upcoming_matches(uuid, uuid) is
  'Cancels pending requests and severs accepted roster ties for shared upcoming matches between two users.';

-- ---------------------------------------------------------------------------
-- 2. block_user — insert block row, then sever shared upcoming matches
-- ---------------------------------------------------------------------------
create or replace function public.block_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Authentication required';
  end if;

  if p_blocked_id is null or p_blocked_id = v_caller then
    raise exception 'Invalid user to block';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_caller, p_blocked_id)
  on conflict (blocker_id, blocked_id) do nothing;

  perform public.sever_shared_upcoming_matches(v_caller, p_blocked_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Accept-after-block hole — reject pending → accepted when blocked
-- ---------------------------------------------------------------------------
create or replace function public.handle_participant_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_accepted integer;
  v_max_attempts constant smallint := 3;
begin
  select * into v_match
  from public.matches
  where id = new.match_id
  for update;

  if v_match.status = 'cancelled' then
    raise exception 'Cannot change participant status on a cancelled match';
  end if;

  if v_match.starts_at <= now() then
    if old.status = 'pending' and new.status in ('accepted', 'rejected') then
      raise exception 'Cannot modify roster after match start';
    end if;

    if old.status = 'accepted' and new.status = 'removed' then
      raise exception 'Cannot remove players after match start';
    end if;

    if old.status = 'accepted' and new.status = 'withdrawn' then
      raise exception 'Cannot withdraw after match start';
    end if;
  end if;

  if old.status = 'pending' and new.status = 'accepted' then
    if public.users_are_blocked(new.profile_id, v_match.host_id) then
      raise exception 'Cannot accept this player';
    end if;

    select count(*) into v_accepted
    from public.match_participants
    where match_id = new.match_id
      and status = 'accepted'
      and id <> new.id;

    if v_accepted + 1 > v_match.open_spots then
      raise exception 'Match % has no open spots remaining (% join slots)',
        new.match_id, v_match.open_spots;
    end if;

    new.responded_at := now();

    if v_accepted + 1 = v_match.open_spots then
      perform set_config('padelcito.match_internal_status_update', 'true', true);

      update public.matches
      set status = 'full'
      where id = new.match_id and status = 'open';
    end if;

  elsif old.status = 'pending' and new.status = 'rejected' then
    new.responded_at := now();

  elsif old.status = 'pending' and new.status = 'cancelled' then
    new.left_at := now();

  elsif old.status = 'cancelled' and new.status = 'pending' then
    if old.attempt_count >= v_max_attempts then
      raise exception 'Request limit reached for this match';
    end if;

    new.attempt_count := old.attempt_count + 1;
    new.requested_at := now();
    new.responded_at := null;
    new.left_at := null;

  elsif old.status = 'accepted' and new.status in ('withdrawn', 'removed') then
    new.left_at := now();

    if v_match.status in ('open', 'full')
       and now() >= v_match.starts_at - v_match.late_withdrawal_threshold then
      if new.status = 'withdrawn' then
        new.was_late_withdrawal := true;
      else
        new.was_removed_by_host := true;
      end if;
    end if;

    perform set_config('padelcito.match_internal_status_update', 'true', true);

    update public.matches
    set status = 'open'
    where id = new.match_id
      and status = 'full'
      and starts_at > now();

  elsif new.status = 'pending' then
    raise exception 'Cannot transition from % to pending', old.status;

  elsif old.status = 'accepted' and new.status = 'cancelled' then
    raise exception 'Accepted participants must withdraw, not cancel';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Block-aware discovery feeds (symmetric via users_are_blocked)
-- ---------------------------------------------------------------------------
create or replace function public.nearby_matches(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m integer default 10000,
  p_sport_id uuid default null
)
returns table (
  id         uuid,
  title      text,
  sport_id   uuid,
  host_id    uuid,
  venue_name text,
  starts_at  timestamptz,
  capacity   smallint,
  status     public.match_status,
  lat        double precision,
  lng        double precision,
  distance_m double precision
)
language sql stable
set search_path = public, extensions
as $$
  select
    m.id, m.title, m.sport_id, m.host_id, m.venue_name,
    m.starts_at, m.capacity, m.status,
    extensions.st_y(m.location::extensions.geometry) as lat,
    extensions.st_x(m.location::extensions.geometry) as lng,
    extensions.st_distance(
      m.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    ) as distance_m
  from public.matches m
  where m.status = 'open'
    and m.is_public
    and m.starts_at > now()
    and (p_sport_id is null or m.sport_id = p_sport_id)
    and not public.users_are_blocked((select auth.uid()), m.host_id)
    and extensions.st_dwithin(
      m.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  order by distance_m;
$$;

create or replace function public.nearby_community_posts(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m integer default 50000,
  p_sport_id uuid default null,
  p_type     public.community_post_type default null
)
returns table (
  id          uuid,
  title       text,
  type        public.community_post_type,
  sport_id    uuid,
  author_id   uuid,
  venue_name  text,
  event_start timestamptz,
  event_end   timestamptz,
  image_path  text,
  distance_m  double precision
)
language sql stable
set search_path = public, extensions
as $$
  select
    f.id,
    f.title,
    f.type,
    f.sport_id,
    f.author_id,
    f.venue_name,
    f.event_start,
    f.event_end,
    f.image_path,
    extensions.st_distance(
      f.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    ) as distance_m
  from public.community_posts f
  where f.status = 'approved'
    and (p_sport_id is null or f.sport_id = p_sport_id)
    and (p_type is null or f.type = p_type)
    and (f.event_end is null or f.event_end >= now())
    and not public.users_are_blocked((select auth.uid()), f.author_id)
    and extensions.st_dwithin(
      f.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  order by distance_m;
$$;
