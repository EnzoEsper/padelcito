-- AFTER triggers that emit in-app notifications for match roster / cancel actions.
-- Keeps existing BEFORE capacity/penalty logic untouched.

-- ---------------------------------------------------------------------------
-- 1. Join request on insert (and re-request handled in status change)
-- ---------------------------------------------------------------------------
create or replace function public.notify_participant_inserted()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_host_id uuid;
begin
  if new.status = 'pending' then
    select host_id into v_host_id
    from public.matches
    where id = new.match_id;

    perform public.emit_notification(
      v_host_id,
      new.profile_id,
      'join_request',
      new.match_id,
      new.id
    );
  end if;

  return new;
end;
$$;

create trigger trg_notify_participant_inserted
  after insert on public.match_participants
  for each row
  execute function public.notify_participant_inserted();

-- ---------------------------------------------------------------------------
-- 2. Roster status transitions
-- ---------------------------------------------------------------------------
create or replace function public.notify_participant_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_host_id uuid;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select host_id into v_host_id
  from public.matches
  where id = new.match_id;

  if old.status = 'pending' and new.status = 'accepted' then
    perform public.emit_notification(
      new.profile_id,
      v_host_id,
      'join_accepted',
      new.match_id,
      new.id
    );
  elsif old.status = 'pending' and new.status = 'rejected' then
    perform public.emit_notification(
      new.profile_id,
      v_host_id,
      'join_rejected',
      new.match_id,
      new.id
    );
  elsif old.status = 'accepted' and new.status = 'withdrawn' then
    perform public.emit_notification(
      v_host_id,
      new.profile_id,
      'participant_withdrawn',
      new.match_id,
      new.id
    );
  elsif old.status = 'accepted' and new.status = 'removed' then
    perform public.emit_notification(
      new.profile_id,
      v_host_id,
      'participant_removed',
      new.match_id,
      new.id
    );
  elsif old.status = 'cancelled' and new.status = 'pending' then
    perform public.emit_notification(
      v_host_id,
      new.profile_id,
      'join_request',
      new.match_id,
      new.id
    );
  end if;

  return new;
end;
$$;

create trigger trg_notify_participant_status_change
  after update of status on public.match_participants
  for each row
  when (old.status is distinct from new.status)
  execute function public.notify_participant_status_change();

-- ---------------------------------------------------------------------------
-- 3. Host cancels match — notify all accepted players
-- ---------------------------------------------------------------------------
create or replace function public.notify_match_cancelled()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_participant record;
begin
  if old.status is distinct from new.status and new.status = 'cancelled' then
    for v_participant in
      select mp.id, mp.profile_id
      from public.match_participants mp
      where mp.match_id = new.id
        and mp.status = 'accepted'
    loop
      perform public.emit_notification(
        v_participant.profile_id,
        new.host_id,
        'match_cancelled',
        new.id,
        v_participant.id
      );
    end loop;
  end if;

  return new;
end;
$$;

create trigger trg_notify_match_cancelled
  after update of status on public.matches
  for each row
  when (old.status is distinct from new.status and new.status = 'cancelled')
  execute function public.notify_match_cancelled();
