-- Platform-wide ban enforcement, discover filtering, ban side effects, and moderator helpers.

-- ---------------------------------------------------------------------------
-- 1. Notification type for banned users
-- ---------------------------------------------------------------------------
alter type public.notification_type add value if not exists 'user_banned';

-- ---------------------------------------------------------------------------
-- 2. Helpers — check ban status for any user (feeds + moderation UI)
-- ---------------------------------------------------------------------------
create or replace function public.is_banned_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.banned_at is not null
  );
$$;

revoke all on function public.is_banned_user(uuid) from public, anon;
grant execute on function public.is_banned_user(uuid) to authenticated;

comment on function public.is_banned_user(uuid) is
  'Returns true when the given profile is platform-banned (banned_at is set).';

create or replace function public.fetch_ban_status_for_users(p_user_ids uuid[])
returns table (
  user_id uuid,
  banned_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can fetch ban status';
  end if;

  return query
  select p.id, p.banned_at
  from public.profiles p
  where p.id = any(p_user_ids);
end;
$$;

revoke all on function public.fetch_ban_status_for_users(uuid[]) from public, anon;
grant execute on function public.fetch_ban_status_for_users(uuid[]) to authenticated;

comment on function public.fetch_ban_status_for_users(uuid[]) is
  'Moderator-only batch lookup of banned_at for reported users in the moderation UI.';

comment on column public.profiles.banned_at is
  'When set, the user is suspended from hosting matches, joining matches, and publishing community posts.';

-- ---------------------------------------------------------------------------
-- 3. Match creation and join gating
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can host matches" on public.matches;

create policy "Authenticated users can host matches"
  on public.matches for insert
  to authenticated
  with check (
    host_id = (select auth.uid())
    and not public.is_banned()
  );

create or replace function public.validate_match_participant_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
begin
  select m.host_id into v_host_id
  from public.matches m
  where m.id = new.match_id;

  if v_host_id is null then
    raise exception 'Match not found';
  end if;

  if public.is_banned_user(new.profile_id) then
    raise exception 'Cannot join this match';
  end if;

  if public.users_are_blocked(new.profile_id, v_host_id) then
    raise exception 'Cannot join this match';
  end if;

  return new;
end;
$$;

create or replace function public.handle_participant_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
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

    if public.is_banned_user(new.profile_id) then
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
-- 4. Community post UPDATE/resubmit gating for banned authors
-- ---------------------------------------------------------------------------
drop policy if exists "Authors and moderators can update community_posts" on public.community_posts;

create policy "Authors and moderators can update community_posts"
  on public.community_posts for update
  to authenticated
  using (author_id = (select auth.uid()) or public.is_moderator())
  with check (
    public.is_moderator()
    or (
      author_id = (select auth.uid())
      and not public.is_banned()
    )
  );

create or replace function public.protect_community_post_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() and public.is_banned() then
    raise exception 'Suspended accounts cannot update community posts';
  end if;

  if public.is_moderator() then
    if new.status is distinct from old.status
       and new.status in ('approved', 'rejected') then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      if new.status = 'approved' then
        new.published_at := coalesce(new.published_at, now());
        new.rejection_reason := null;
      end if;
    end if;
  elsif old.author_id <> auth.uid() then
    raise exception 'Only the author or a moderator can update this community post';
  elsif new.status = 'archived' and old.status = 'approved' then
    null;
  elsif old.status not in ('pending_review', 'rejected') then
    raise exception 'This community post can no longer be edited';
  else
    if new.status = 'approved' then
      raise exception 'Only a moderator can approve community_posts';
    end if;

    if old.status = 'rejected' and new.status = 'pending_review' then
      new.rejection_reason := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.published_at := null;
    elsif new.status not in ('pending_review', 'rejected', 'archived') then
      raise exception 'Invalid community post status for author update: %', new.status;
    end if;
  end if;

  new.author_id := old.author_id;
  new.contact_phone := old.contact_phone;
  new.contact_verified_at := old.contact_verified_at;
  new.report_count := old.report_count;
  new.created_at := old.created_at;

  if not public.is_moderator() then
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.published_at := old.published_at;
    new.rejection_reason := old.rejection_reason;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Discover feeds — hide banned hosts and authors
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
language sql
stable
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
    and not public.is_banned_user(m.host_id)
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
language sql
stable
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
    and not public.is_banned_user(f.author_id)
    and extensions.st_dwithin(
      f.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  order by distance_m;
$$;

-- ---------------------------------------------------------------------------
-- 6. set_user_banned — side effects on ban; clear flag on unban
-- ---------------------------------------------------------------------------
create or replace function public.set_user_banned(
  p_user_id uuid,
  p_banned boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moderator_id uuid := auth.uid();
begin
  if v_moderator_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_moderator() then
    raise exception 'Only moderators can ban users';
  end if;

  if p_user_id = v_moderator_id then
    raise exception 'You cannot ban yourself';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'admin'
  ) then
    raise exception 'Cannot ban an admin';
  end if;

  perform set_config('padelcito.profile_internal_update', 'true', true);

  update public.profiles
  set banned_at = case when p_banned then now() else null end,
      updated_at = now()
  where id = p_user_id;

  if not p_banned then
    return;
  end if;

  perform set_config('padelcito.match_internal_status_update', 'true', true);

  update public.matches m
  set status = 'cancelled'
  where m.host_id = p_user_id
    and m.status in ('open', 'full')
    and m.starts_at > now();

  update public.match_participants mp
  set status = 'withdrawn'
  from public.matches m
  where mp.match_id = m.id
    and mp.profile_id = p_user_id
    and mp.status = 'accepted'
    and m.status in ('open', 'full')
    and m.starts_at > now();

  update public.user_reports ur
  set resolved_at = now(),
      reviewed_by = v_moderator_id
  where ur.reported_id = p_user_id
    and ur.resolved_at is null;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    data
  )
  values (
    p_user_id,
    v_moderator_id,
    'user_banned'::public.notification_type,
    jsonb_build_object(
      'support_email', 'support@padelcito.app'
    )
  );
end;
$$;

comment on function public.set_user_banned(uuid, boolean) is
  'Moderator ban/unban. Ban cancels upcoming hosted matches, withdraws accepted roster ties, auto-resolves open reports, and notifies the user.';
