-- Security hardening: profile field protection, 1:1 contact RPC, match status locks,
-- Places quota, community post archive path, least-privilege anon grants, dormant-feature fixes.

-- ---------------------------------------------------------------------------
-- 1. Internal-update session flags (used by triggers and SECURITY DEFINER RPCs)
-- ---------------------------------------------------------------------------
comment on schema public is
  'Session flags: padelcito.profile_internal_update, padelcito.match_internal_status_update';

-- ---------------------------------------------------------------------------
-- 2. protect_profile_fields — block client writes to privileged / aggregate columns
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if current_setting('padelcito.profile_internal_update', true) = 'true' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Cannot change platform role';
  end if;

  if new.banned_at is distinct from old.banned_at then
    raise exception 'Cannot change ban status';
  end if;

  if new.whatsapp_verified_at is distinct from old.whatsapp_verified_at then
    raise exception 'Cannot change WhatsApp verification status';
  end if;

  if new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.reliability_score is distinct from old.reliability_score
     or new.penalty_count is distinct from old.penalty_count
     or new.commitment_count is distinct from old.commitment_count then
    raise exception 'Trust aggregates are read-only';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;

create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Wrap internal profile writers with the session flag.
create or replace function public.apply_rating_to_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ratee uuid := coalesce(new.ratee_id, old.ratee_id);
begin
  perform set_config('padelcito.profile_internal_update', 'true', true);

  update public.profiles p
  set rating_avg   = sub.avg_stars,
      rating_count = sub.cnt
  from (
    select round(avg(stars)::numeric, 2) as avg_stars, count(*) as cnt
    from public.ratings
    where ratee_id = v_ratee
  ) sub
  where p.id = v_ratee;

  return coalesce(new, old);
end;
$$;

create or replace function public.recompute_profile_commitments(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if p_profile_id is null then
    return;
  end if;

  select (
    (
      select count(*)
      from public.matches m
      where m.host_id = p_profile_id
        and m.status = 'finished'
        and public.match_accepted_count(m.id) >= 1
    )
    + (
      select count(*)
      from public.match_participants mp
      inner join public.matches m on m.id = mp.match_id
      where mp.profile_id = p_profile_id
        and mp.status = 'accepted'
        and m.status = 'finished'
    )
    + (
      select count(*)
      from public.matches m
      where m.host_id = p_profile_id
        and m.status = 'cancelled'
        and public.match_accepted_count(m.id) >= 1
        and public.is_late_match_cancellation(m)
    )
    + (
      select count(*)
      from public.match_participants mp
      inner join public.matches m on m.id = mp.match_id
      where mp.profile_id = p_profile_id
        and mp.status = 'accepted'
        and m.status = 'cancelled'
        and public.is_late_match_cancellation(m)
    )
    + (
      select count(*)
      from public.match_participants mp
      where mp.profile_id = p_profile_id
        and mp.status = 'withdrawn'
        and mp.was_late_withdrawal
    )
    + (
      select count(*)
      from public.match_participants mp
      where mp.profile_id = p_profile_id
        and mp.status = 'removed'
        and mp.was_removed_by_host
    )
  ) into v_count;

  perform set_config('padelcito.profile_internal_update', 'true', true);

  update public.profiles
  set commitment_count = coalesce(v_count, 0)
  where id = p_profile_id;
end;
$$;

create or replace function public.recompute_profile_reliability(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_penalty_count integer;
  v_commitment_count integer;
  v_score numeric(5, 2);
  v_min_commitments constant integer := 3;
begin
  if p_profile_id is null then
    return;
  end if;

  select count(*) into v_penalty_count
  from public.reliability_reports
  where subject_id = p_profile_id;

  select commitment_count into v_commitment_count
  from public.profiles
  where id = p_profile_id;

  if v_commitment_count is null
     or v_commitment_count = 0
     or v_commitment_count < v_min_commitments then
    v_score := null;
  else
    v_score := round(
      100.0 * (1.0 - (v_penalty_count::numeric / v_commitment_count::numeric)),
      2
    );
    if v_score < 0 then
      v_score := 0;
    end if;
  end if;

  perform set_config('padelcito.profile_internal_update', 'true', true);

  update public.profiles
  set penalty_count = v_penalty_count,
      reliability_score = v_score
  where id = p_profile_id;
end;
$$;

create or replace function public.increment_profile_commitment(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_profile_id is null then
    return;
  end if;

  perform set_config('padelcito.profile_internal_update', 'true', true);

  update public.profiles
  set commitment_count = commitment_count + 1
  where id = p_profile_id;

  perform public.recompute_profile_reliability(p_profile_id);
end;
$$;

create or replace function public.set_user_banned(
  p_user_id uuid,
  p_banned boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_moderator() then
    raise exception 'Only moderators can ban users';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot ban yourself';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.role = 'admin'
  ) then
    raise exception 'Cannot ban an admin';
  end if;

  perform set_config('padelcito.profile_internal_update', 'true', true);

  update public.profiles
  set banned_at = case when p_banned then now() else null end,
      updated_at = now()
  where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. match_contact_details — 1:1 only (host ↔ caller)
-- ---------------------------------------------------------------------------
create or replace function public.match_contact_details(p_match_id uuid)
returns table (
  profile_id     uuid,
  display_name   text,
  whatsapp_phone text,
  whatsapp_link  text
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_match_member(p_match_id) then
    raise exception 'Only the host and accepted participants can access contact details';
  end if;

  if not public.is_match_active(p_match_id) then
    raise exception 'Contact details are not available for finished or cancelled matches';
  end if;

  select m.host_id into v_host_id
  from public.matches m
  where m.id = p_match_id;

  if v_host_id is null then
    raise exception 'Match not found';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.whatsapp_phone,
    case when p.whatsapp_phone is not null
      then 'https://wa.me/' || regexp_replace(p.whatsapp_phone, '\D', '', 'g')
    end
  from public.profiles p
  where p.id in (
    select v_host_id
    where v_caller_id <> v_host_id
    union
    select mp.profile_id
    from public.match_participants mp
    where mp.match_id = p_match_id
      and mp.status = 'accepted'
      and v_caller_id = v_host_id
      and mp.profile_id <> v_host_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Match status — hosts may only cancel pre-start; internal lifecycle bypass
-- ---------------------------------------------------------------------------
create or replace function public.protect_match_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if current_setting('padelcito.match_internal_status_update', true) = 'true' then
    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status = 'cancelled' and public.is_match_pre_start(old.id) then
      return new;
    end if;

    raise exception 'Match status cannot be changed directly';
  end if;

  return new;
end;
$$;

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
    perform set_config('padelcito.match_internal_status_update', 'true', true);

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

create or replace function public.finalize_due_matches()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_match record;
  v_count integer := 0;
begin
  perform set_config('padelcito.match_internal_status_update', 'true', true);

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
-- 5. consume_places_search_quota — fixed limits (no client-controlled params)
-- ---------------------------------------------------------------------------
drop function if exists public.consume_places_search_quota(int, int);

create or replace function public.consume_places_search_quota()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count int;
  v_limit constant int := 20;
  v_window_seconds constant int := 60;
  v_window_start timestamptz;
begin
  if v_user_id is null then
    return false;
  end if;

  v_window_start := now() - make_interval(secs => v_window_seconds);

  select count(*)::int
  into v_count
  from public.places_search_rate_limits r
  where r.user_id = v_user_id
    and r.requested_at >= v_window_start;

  if v_count >= v_limit then
    return false;
  end if;

  insert into public.places_search_rate_limits (user_id)
  values (v_user_id);

  delete from public.places_search_rate_limits
  where requested_at < now() - interval '24 hours';

  return true;
end;
$$;

revoke all on function public.consume_places_search_quota() from public;
grant execute on function public.consume_places_search_quota() to authenticated;

comment on function public.consume_places_search_quota() is
  'SECURITY DEFINER quota gate for places-search Edge Function. Fixed: 20 requests per 60 s per user.';

-- ---------------------------------------------------------------------------
-- 6. protect_community_post_fields — lock immutable fields on all paths
-- ---------------------------------------------------------------------------
create or replace function public.protect_community_post_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
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
-- 7. Least-privilege Data API grants for anon (read-only; RLS still applies)
-- ---------------------------------------------------------------------------
revoke insert, update, delete on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- 8. Dormant-feature fixes
-- ---------------------------------------------------------------------------

-- 8a. Conversation self-join hole
drop policy if exists "Creators add members, users add themselves"
  on public.conversation_members;

create policy "Conversation creators add members"
  on public.conversation_members for insert
  to authenticated
  with check (public.is_conversation_creator(conversation_id));

-- 8b. Tournament score updates limited to organizer or fixture participant
create or replace function public.can_update_tournament_match_score(p_tournament_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_stage_organizer(
    (select tm.stage_id from public.tournament_matches tm where tm.id = p_tournament_match_id)
  )
  or (
    public.can_report_score(p_tournament_match_id)
    and exists (
      select 1
      from public.tournament_matches tm
      left join public.tournament_registrations ra on ra.id = tm.side_a_registration_id
      left join public.tournament_registrations rb on rb.id = tm.side_b_registration_id
      where tm.id = p_tournament_match_id
        and (ra.profile_id = auth.uid() or rb.profile_id = auth.uid())
    )
  );
$$;

revoke all on function public.can_update_tournament_match_score(uuid) from public, anon;
grant execute on function public.can_update_tournament_match_score(uuid) to authenticated;

drop policy if exists "Organizers and local participants can report scores"
  on public.tournament_matches;

create policy "Organizers and fixture participants can report scores"
  on public.tournament_matches for update
  to authenticated
  using (public.can_update_tournament_match_score(id))
  with check (public.can_update_tournament_match_score(id));

-- 8c. recompute_stage_standings — internal only
revoke all on function public.recompute_stage_standings(uuid) from public, anon, authenticated;

-- 8d. Ratings are insert-only (double-blind); block client updates
drop policy if exists "Raters can update their own ratings"
  on public.ratings;

create or replace function public.block_rating_updates()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'Ratings cannot be modified after submission';
end;
$$;

drop trigger if exists trg_block_rating_updates on public.ratings;

create trigger trg_block_rating_updates
  before update on public.ratings
  for each row execute function public.block_rating_updates();
