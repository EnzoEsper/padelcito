-- Reliability anti-gaming: qualified commitments, penalty dedup, min public sample, backfill.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.match_accepted_count(p_match_id uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::integer
  from public.match_participants mp
  where mp.match_id = p_match_id
    and mp.status = 'accepted';
$$;

revoke all on function public.match_accepted_count(uuid) from public, anon, authenticated;

create or replace function public.is_late_match_cancellation(p_match public.matches)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_match.cancelled_at is not null
    and p_match.cancelled_at >= p_match.starts_at - p_match.late_withdrawal_threshold;
$$;

revoke all on function public.is_late_match_cancellation(public.matches) from public, anon, authenticated;

comment on column public.profiles.commitment_count is
  'Qualified lifetime commitments: finished/cancelled/withdrawn/removed events that involved another player or a late penalty flag.';

comment on column public.profiles.reliability_score is
  'Public percentage when commitment_count >= 3: 100 * (1 - penalty_count / commitment_count); null when below minimum sample.';

-- ---------------------------------------------------------------------------
-- 2. Recompute commitments from source tables (qualified rules)
-- ---------------------------------------------------------------------------
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

  update public.profiles
  set commitment_count = coalesce(v_count, 0)
  where id = p_profile_id;
end;
$$;

revoke all on function public.recompute_profile_commitments(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Recompute reliability score (min 3 commitments for public score)
-- ---------------------------------------------------------------------------
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

  update public.profiles
  set penalty_count = v_penalty_count,
      reliability_score = v_score
  where id = p_profile_id;
end;
$$;

revoke all on function public.recompute_profile_reliability(uuid) from public, anon, authenticated;

create or replace function public.recompute_all_profile_reliability()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles loop
    perform public.recompute_profile_commitments(v_profile.id);
    perform public.recompute_profile_reliability(v_profile.id);
  end loop;
end;
$$;

revoke all on function public.recompute_all_profile_reliability() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Triggers — recompute instead of blind increment
-- ---------------------------------------------------------------------------
create or replace function public.increment_profile_commitment(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.recompute_profile_commitments(p_profile_id);
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
    perform public.recompute_profile_commitments(new.host_id);
    perform public.recompute_profile_reliability(new.host_id);

    for v_participant in
      select mp.profile_id
      from public.match_participants mp
      where mp.match_id = new.id
        and mp.status = 'accepted'
    loop
      perform public.recompute_profile_commitments(v_participant.profile_id);
      perform public.recompute_profile_reliability(v_participant.profile_id);
    end loop;
  end if;

  return new;
end;
$$;

create or replace function public.track_participant_commitment()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status = 'accepted'
     and new.status in ('withdrawn', 'removed') then
    perform public.recompute_profile_commitments(new.profile_id);
    perform public.recompute_profile_reliability(new.profile_id);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Penalty dedup — one strike per (match, subject, type)
-- ---------------------------------------------------------------------------
delete from public.reliability_reports rr
where rr.id in (
  select ranked.id
  from (
    select
      id,
      row_number() over (
        partition by match_id, subject_id, type
        order by created_at asc, id asc
      ) as rn
    from public.reliability_reports
  ) ranked
  where ranked.rn > 1
);

alter table public.reliability_reports
  drop constraint if exists reliability_reports_match_id_reporter_id_subject_id_type_key;

alter table public.reliability_reports
  add constraint reliability_reports_match_subject_type_key
  unique (match_id, subject_id, type);

comment on table public.reliability_reports is
  'Optional penalty confirmations; at most one report per (match, subject, event type).';

-- ---------------------------------------------------------------------------
-- 6. Backfill all profiles under new rules
-- ---------------------------------------------------------------------------
select public.recompute_all_profile_reliability();
