-- Pre-start roster locks, lifecycle sync, and post-start mutation guards.
-- Depends on: 20260622120000_block_actions_on_cancelled_matches.sql

-- ---------------------------------------------------------------------------
-- 1. Helpers — pre-start and roster-editable windows
-- ---------------------------------------------------------------------------
create or replace function public.is_match_pre_start(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and m.status in ('open', 'full')
      and m.starts_at > now()
  );
$$;

create or replace function public.is_match_roster_editable(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_match_pre_start(p_match_id);
$$;

-- ---------------------------------------------------------------------------
-- 2. Lifecycle sync — open/full -> in_progress -> completed
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

  if not public.is_match_host(p_match_id)
     and not public.has_match_relationship(p_match_id) then
    raise exception 'Not authorized to sync this match';
  end if;

  v_ends_at := v_match.starts_at + make_interval(mins => v_match.duration_minutes);
  v_new_status := v_match.status;

  if v_match.status in ('open', 'full') then
    if v_ends_at <= now() then
      v_new_status := 'completed';
    elsif v_match.starts_at <= now() then
      v_new_status := 'in_progress';
    end if;
  elsif v_match.status = 'in_progress' and v_ends_at <= now() then
    v_new_status := 'completed';
  end if;

  if v_new_status <> v_match.status then
    update public.matches
    set status = v_new_status
    where id = p_match_id;
  end if;

  return v_new_status;
end;
$$;

revoke execute on function public.sync_match_lifecycle(uuid) from public, anon;
grant execute on function public.sync_match_lifecycle(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Block host cancellation after start
-- ---------------------------------------------------------------------------
create or replace function public.protect_match_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status is distinct from new.status
     and new.status = 'cancelled'
     and not public.is_match_pre_start(old.id) then
    raise exception 'Cannot cancel a match after it has started';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_match_status_change on public.matches;

create trigger trg_protect_match_status_change
  before update of status on public.matches
  for each row
  when (old.status is distinct from new.status)
  execute function public.protect_match_status_change();

-- ---------------------------------------------------------------------------
-- 4. Participant state machine — block roster/withdraw after start
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
  for update; -- serialize concurrent acceptances against the same match

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

  -- pending -> accepted: enforce open_spots, flip match to 'full' when exhausted
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
      update public.matches
      set status = 'full'
      where id = new.match_id and status = 'open';
    end if;

  -- pending -> rejected: stamp response time
  elsif old.status = 'pending' and new.status = 'rejected' then
    new.responded_at := now();

  -- pending -> cancelled: soft cancel, preserve row for audit + rate limiting
  elsif old.status = 'pending' and new.status = 'cancelled' then
    new.left_at := now();

  -- cancelled -> pending: re-request with attempt cap
  elsif old.status = 'cancelled' and new.status = 'pending' then
    if old.attempt_count >= v_max_attempts then
      raise exception 'Request limit reached for this match';
    end if;

    new.attempt_count := old.attempt_count + 1;
    new.requested_at := now();
    new.responded_at := null;
    new.left_at := null;

  -- accepted -> withdrawn/removed: penalty window + seat reopening
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

    update public.matches
    set status = 'open'
    where id = new.match_id
      and status = 'full'
      and starts_at > now();

  -- Block illegal transitions to pending (host rejection is terminal)
  elsif new.status = 'pending' then
    raise exception 'Cannot transition from % to pending', old.status;

  -- Block cancel on accepted participation (must withdraw instead)
  elsif old.status = 'accepted' and new.status = 'cancelled' then
    raise exception 'Accepted participants must withdraw, not cancel';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS — roster edits and withdraw only before start
-- ---------------------------------------------------------------------------
drop policy if exists "Hosts can accept, reject or remove participants"
  on public.match_participants;

create policy "Hosts can accept, reject or remove participants"
  on public.match_participants for update
  to authenticated
  using (
    public.is_match_host(match_id)
    and public.is_match_roster_editable(match_id)
  )
  with check (
    public.is_match_host(match_id)
    and public.is_match_roster_editable(match_id)
    and status in ('accepted', 'rejected', 'removed')
  );

drop policy if exists "Participants can withdraw themselves"
  on public.match_participants;

create policy "Participants can withdraw themselves"
  on public.match_participants for update
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_match_active(match_id)
  )
  with check (
    profile_id = (select auth.uid())
    and public.is_match_active(match_id)
    and status in ('withdrawn', 'cancelled', 'pending')
    and (
      status = 'cancelled'
      or (
        status = 'pending'
        and public.is_match_open(match_id)
        and not public.is_match_host(match_id)
      )
      or (
        status = 'withdrawn'
        and public.is_match_pre_start(match_id)
      )
    )
  );
