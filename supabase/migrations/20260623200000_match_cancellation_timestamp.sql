-- Late-cancellation detection: stamp cancelled_at and enrich match_cancelled notifications.

-- ---------------------------------------------------------------------------
-- 1. cancelled_at column
-- ---------------------------------------------------------------------------
alter table public.matches
  add column cancelled_at timestamptz;

comment on column public.matches.cancelled_at is
  'Set when status becomes cancelled. Used for late-cancellation penalty eligibility.';

-- ---------------------------------------------------------------------------
-- 2. Stamp cancelled_at on host cancel (complements protect_match_status_change)
-- ---------------------------------------------------------------------------
create or replace function public.stamp_match_cancelled_at()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'cancelled' then
    new.cancelled_at := now();
  end if;

  return new;
end;
$$;

create trigger trg_stamp_match_cancelled_at
  before update of status on public.matches
  for each row
  when (old.status is distinct from new.status and new.status = 'cancelled')
  execute function public.stamp_match_cancelled_at();

-- ---------------------------------------------------------------------------
-- 3. Pass was_late_cancellation in match_cancelled notification data
-- ---------------------------------------------------------------------------
create or replace function public.notify_match_cancelled()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_participant record;
  v_was_late boolean;
begin
  if old.status is distinct from new.status and new.status = 'cancelled' then
    v_was_late := coalesce(new.cancelled_at, now()) >= new.starts_at - new.late_withdrawal_threshold;

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
        v_participant.id,
        jsonb_build_object('was_late_cancellation', v_was_late)
      );
    end loop;
  end if;

  return new;
end;
$$;
