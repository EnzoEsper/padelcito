-- Reliability aggregates on profiles, commitment tracking, quality-only ratings.

-- ---------------------------------------------------------------------------
-- 1. Profile reliability columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column penalty_count integer not null default 0 check (penalty_count >= 0),
  add column commitment_count integer not null default 0 check (commitment_count >= 0),
  add column reliability_score numeric(5, 2) check (reliability_score between 0 and 100);

comment on column public.profiles.penalty_count is
  'Count of reliability_reports where this profile is the subject.';
comment on column public.profiles.commitment_count is
  'Denominator for reliability_score: finished/cancelled/withdrawn/removed commitments.';
comment on column public.profiles.reliability_score is
  'Denormalized percentage: 100 * (1 - penalty_count / commitment_count); null when no commitments.';

-- ---------------------------------------------------------------------------
-- 2. Recompute helper
-- ---------------------------------------------------------------------------
create or replace function public.recompute_profile_reliability(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_penalty_count integer;
  v_commitment_count integer;
  v_score numeric(5, 2);
begin
  select count(*) into v_penalty_count
  from public.reliability_reports
  where subject_id = p_profile_id;

  select commitment_count into v_commitment_count
  from public.profiles
  where id = p_profile_id;

  if v_commitment_count is null or v_commitment_count = 0 then
    v_score := null;
  else
    v_score := round(100.0 * (1.0 - (v_penalty_count::numeric / v_commitment_count::numeric)), 2);
    if v_score < 0 then
      v_score := 0;
    end if;
  end if;

  update public.profiles
  set penalty_count = v_penalty_count,
      reliability_score = v_score
  where id = p_profile_id;
end;
$$;

revoke all on function public.recompute_profile_reliability(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Apply reliability report -> recompute subject aggregates
-- ---------------------------------------------------------------------------
create or replace function public.apply_reliability_report()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_subject uuid := coalesce(new.subject_id, old.subject_id);
begin
  perform public.recompute_profile_reliability(v_subject);
  return coalesce(new, old);
end;
$$;

create trigger trg_apply_reliability_report
  after insert or delete on public.reliability_reports
  for each row
  execute function public.apply_reliability_report();

-- ---------------------------------------------------------------------------
-- 4. Increment commitments on terminal match / participant events
-- ---------------------------------------------------------------------------
create or replace function public.increment_profile_commitment(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_profile_id is null then
    return;
  end if;

  update public.profiles
  set commitment_count = commitment_count + 1
  where id = p_profile_id;

  perform public.recompute_profile_reliability(p_profile_id);
end;
$$;

revoke all on function public.increment_profile_commitment(uuid) from public, anon, authenticated;

create or replace function public.track_match_commitments()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_participant record;
begin
  if old.status is distinct from new.status
     and new.status in ('finished', 'cancelled') then
    perform public.increment_profile_commitment(new.host_id);

    for v_participant in
      select mp.profile_id
      from public.match_participants mp
      where mp.match_id = new.id
        and mp.status = 'accepted'
    loop
      perform public.increment_profile_commitment(v_participant.profile_id);
    end loop;
  end if;

  return new;
end;
$$;

create trigger trg_track_match_commitments
  after update of status on public.matches
  for each row
  when (old.status is distinct from new.status and new.status in ('finished', 'cancelled'))
  execute function public.track_match_commitments();

create or replace function public.track_participant_commitment()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status = 'accepted'
     and new.status in ('withdrawn', 'removed') then
    perform public.increment_profile_commitment(new.profile_id);
  end if;

  return new;
end;
$$;

create trigger trg_track_participant_commitment
  after update of status on public.match_participants
  for each row
  when (old.status = 'accepted' and new.status in ('withdrawn', 'removed'))
  execute function public.track_participant_commitment();

-- ---------------------------------------------------------------------------
-- 5. Quality ratings: standard context only
-- ---------------------------------------------------------------------------
create or replace function public.validate_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
begin
  if new.context <> 'standard' then
    raise exception 'Only standard quality ratings are supported; use reliability_reports for penalties';
  end if;

  select * into v_match from public.matches where id = new.match_id;
  if not found then
    raise exception 'Match % does not exist', new.match_id;
  end if;

  if v_match.status <> 'finished' then
    raise exception 'Standard ratings are only allowed after the match is finished';
  end if;

  if not public.is_match_member_of(new.match_id, new.rater_id)
     or not public.is_match_member_of(new.match_id, new.ratee_id) then
    raise exception 'Standard ratings require both rater and ratee to be match members';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. public_profiles — expose reliability signals (reviewed addition)
-- ---------------------------------------------------------------------------
drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = off) as
select
  id,
  username,
  display_name,
  avatar_url,
  bio,
  rating_avg,
  rating_count,
  reliability_score,
  penalty_count,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;
