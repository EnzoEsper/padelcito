-- Block roster and contact actions once a match is cancelled.
-- Depends on: match_status enum value 'cancelled' (0001_initial_schema).

-- ---------------------------------------------------------------------------
-- 1. Helper — active matches only (not cancelled)
-- ---------------------------------------------------------------------------
create or replace function public.is_match_active(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and m.status <> 'cancelled'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Participant state machine — reject any status change on cancelled matches
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
-- 3. RLS — hosts and participants cannot mutate roster on cancelled matches
-- ---------------------------------------------------------------------------
drop policy if exists "Hosts can accept, reject or remove participants"
  on public.match_participants;

create policy "Hosts can accept, reject or remove participants"
  on public.match_participants for update
  to authenticated
  using (
    public.is_match_host(match_id)
    and public.is_match_active(match_id)
  )
  with check (
    public.is_match_host(match_id)
    and public.is_match_active(match_id)
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
      status <> 'pending'
      or (
        public.is_match_open(match_id)
        and not public.is_match_host(match_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. WhatsApp contact reveal — unavailable after cancellation
-- ---------------------------------------------------------------------------
create or replace function public.match_contact_details(p_match_id uuid)
returns table (
  profile_id    uuid,
  display_name  text,
  whatsapp_phone text,
  whatsapp_link text
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_match_member(p_match_id) then
    raise exception 'Only the host and accepted participants can access contact details';
  end if;
  if not public.is_match_active(p_match_id) then
    raise exception 'Contact details are not available for cancelled matches';
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
    select m.host_id from public.matches m where m.id = p_match_id
    union
    select mp.profile_id
    from public.match_participants mp
    where mp.match_id = p_match_id and mp.status = 'accepted'
  );
end;
$$;
