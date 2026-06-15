-- ============================================================================
-- Join-request anti-spam: soft cancel + per-match attempt cap
-- Depends on: 20260613100000_0002_participant_status_cancelled.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Attempt counter (tracks how many times a row entered 'pending')
-- ---------------------------------------------------------------------------
alter table public.match_participants
  add column if not exists attempt_count smallint not null default 1
  check (attempt_count >= 1);

comment on column public.match_participants.attempt_count is
  'Number of times this participant row has entered pending. Capped by handle_participant_status_change.';

-- ---------------------------------------------------------------------------
-- 2. Participant state machine — cancel, re-request cap, illegal transitions
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

  -- pending -> accepted: enforce capacity, flip match to 'full' when it fills
  if old.status = 'pending' and new.status = 'accepted' then
    select count(*) into v_accepted
    from public.match_participants
    where match_id = new.match_id
      and status = 'accepted'
      and id <> new.id;

    -- +1 for this participant, +1 for the host
    if v_accepted + 2 > v_match.capacity then
      raise exception 'Match % is already at full capacity (% players)',
        new.match_id, v_match.capacity;
    end if;

    new.responded_at := now();

    if v_accepted + 2 = v_match.capacity then
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
-- 3. RLS — soft cancel + re-request via UPDATE (no DELETE on cancel)
-- ---------------------------------------------------------------------------
drop policy if exists "Requesters can cancel a pending request"
  on public.match_participants;

drop policy if exists "Participants can withdraw themselves"
  on public.match_participants;

create policy "Participants can withdraw themselves"
  on public.match_participants for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and status in ('withdrawn', 'cancelled', 'pending')
    and (
      status <> 'pending'
      or (
        public.is_match_open(match_id)
        and not public.is_match_host(match_id)
      )
    )
  );
