-- Reliability reports: separate from quality ratings; validated penalty confirmations.

-- ---------------------------------------------------------------------------
-- 1. Enum + table
-- ---------------------------------------------------------------------------
create type public.reliability_event_type as enum (
  'late_withdrawal',
  'host_removal',
  'late_cancellation'
);

create table public.reliability_reports (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references public.matches (id) on delete cascade,
  reporter_id     uuid not null references public.profiles (id) on delete cascade,
  subject_id      uuid not null references public.profiles (id) on delete cascade,
  type            public.reliability_event_type not null,
  participant_id  uuid references public.match_participants (id) on delete set null,
  reason_tags     text[] not null default '{}',
  comment         text check (char_length(comment) <= 500),
  created_at      timestamptz not null default now(),
  unique (match_id, reporter_id, subject_id, type),
  check (reporter_id <> subject_id)
);

comment on table public.reliability_reports is
  'Optional penalty confirmations by wronged parties; drives profiles.reliability_score.';

create index idx_reliability_reports_match_id
  on public.reliability_reports (match_id);

create index idx_reliability_reports_reporter_id
  on public.reliability_reports (reporter_id);

create index idx_reliability_reports_subject_id
  on public.reliability_reports (subject_id);

-- ---------------------------------------------------------------------------
-- 2. RLS + grants
-- ---------------------------------------------------------------------------
alter table public.reliability_reports enable row level security;

revoke all on public.reliability_reports from anon, authenticated;
grant select, insert on public.reliability_reports to authenticated;

create policy "Reporters and subjects can read reliability reports"
  on public.reliability_reports for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or subject_id = (select auth.uid())
  );

create policy "Users can submit reliability reports as themselves"
  on public.reliability_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Validation — roles, flags, 7-day reporting window
-- ---------------------------------------------------------------------------
create or replace function public.validate_reliability_report()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_participant public.match_participants%rowtype;
  v_reporting_window constant interval := interval '7 days';
  v_event_at timestamptz;
begin
  select * into v_match
  from public.matches
  where id = new.match_id;

  if not found then
    raise exception 'Match % does not exist', new.match_id;
  end if;

  if new.type = 'late_withdrawal' then
    if new.reporter_id <> v_match.host_id then
      raise exception 'Only the match host can report late_withdrawal';
    end if;

    select * into v_participant
    from public.match_participants mp
    where mp.match_id = new.match_id
      and mp.profile_id = new.subject_id
      and mp.was_late_withdrawal;

    if not found then
      raise exception 'late_withdrawal requires the subject to carry was_late_withdrawal on this match';
    end if;

    v_event_at := v_participant.left_at;
    new.participant_id := coalesce(new.participant_id, v_participant.id);

  elsif new.type = 'host_removal' then
    if new.subject_id <> v_match.host_id then
      raise exception 'host_removal reports must target the match host';
    end if;

    select * into v_participant
    from public.match_participants mp
    where mp.match_id = new.match_id
      and mp.profile_id = new.reporter_id
      and mp.was_removed_by_host;

    if not found then
      raise exception 'host_removal requires the reporter to have been removed within the penalty window';
    end if;

    v_event_at := v_participant.left_at;
    new.participant_id := coalesce(new.participant_id, v_participant.id);

  elsif new.type = 'late_cancellation' then
    if new.subject_id <> v_match.host_id then
      raise exception 'late_cancellation reports must target the match host';
    end if;

    if v_match.cancelled_at is null then
      raise exception 'Match has no cancellation timestamp';
    end if;

    if v_match.cancelled_at < v_match.starts_at - v_match.late_withdrawal_threshold then
      raise exception 'Cancellation was not within the late-cancellation penalty window';
    end if;

    if not exists (
      select 1
      from public.match_participants mp
      where mp.match_id = new.match_id
        and mp.profile_id = new.reporter_id
        and mp.status = 'accepted'
    ) then
      raise exception 'Only accepted participants can report late_cancellation';
    end if;

    v_event_at := v_match.cancelled_at;
  end if;

  if v_event_at is null then
    raise exception 'Cannot determine event time for reliability report';
  end if;

  if now() > v_event_at + v_reporting_window then
    raise exception 'Reporting window has expired for this event';
  end if;

  return new;
end;
$$;

create trigger trg_validate_reliability_report
  before insert on public.reliability_reports
  for each row
  execute function public.validate_reliability_report();
