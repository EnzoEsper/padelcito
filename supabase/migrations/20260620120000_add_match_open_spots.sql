-- ============================================================================
-- Match open spots: persist joinable slots separate from total capacity
-- Depends on: 20260619120000_restrict_match_position_preference.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column + backfill
-- ---------------------------------------------------------------------------
alter table public.matches
  add column open_spots smallint;

update public.matches
set open_spots = capacity - 1
where open_spots is null;

alter table public.matches
  alter column open_spots set not null;

alter table public.matches
  add constraint matches_open_spots_range
  check (open_spots >= 1 and open_spots <= capacity - 1);

comment on column public.matches.open_spots is
  'In-app join slots available at creation. Offline confirmed players = capacity - 1 - open_spots.';

-- ---------------------------------------------------------------------------
-- 2. Participant state machine — enforce open_spots, not total capacity
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
