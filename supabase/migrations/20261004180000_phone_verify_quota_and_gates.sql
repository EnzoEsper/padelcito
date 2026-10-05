-- Phone verification (increment 2): OTP send quotas, verification RPC, match/community gates,
-- and public_profiles.whatsapp_verified boolean.

-- ---------------------------------------------------------------------------
-- 1. OTP send audit / quota (no plaintext phone numbers)
-- ---------------------------------------------------------------------------
create table public.phone_verify_quota (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  phone_hash text not null check (char_length(phone_hash) = 64),
  requested_at timestamptz not null default now()
);

create index idx_phone_verify_quota_user_requested
  on public.phone_verify_quota (user_id, requested_at desc);

create index idx_phone_verify_quota_hash_requested
  on public.phone_verify_quota (phone_hash, requested_at desc);

alter table public.phone_verify_quota enable row level security;

create policy phone_verify_quota_no_client
  on public.phone_verify_quota
  for all
  to authenticated, anon
  using (false)
  with check (false);

comment on table public.phone_verify_quota is
  'Append-only OTP send events for phone verification rate limits. phone_hash is SHA-256 hex; never store E.164.';

-- Returns true when the caller may send another OTP; false when over quota (HTTP 429).
create or replace function public.consume_phone_verify_quota(p_phone_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_user_count int;
  v_phone_count int;
  v_window_start timestamptz;
  v_day_start timestamptz;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_phone_hash is null or char_length(p_phone_hash) <> 64 then
    return false;
  end if;

  v_window_start := now() - interval '10 minutes';
  v_day_start := date_trunc('day', now() at time zone 'America/Buenos_Aires');

  select count(*)::int
  into v_user_count
  from public.phone_verify_quota q
  where q.user_id = v_user_id
    and q.requested_at >= v_window_start;

  if v_user_count >= 5 then
    return false;
  end if;

  select count(*)::int
  into v_phone_count
  from public.phone_verify_quota q
  where q.phone_hash = p_phone_hash
    and q.requested_at >= v_day_start;

  if v_phone_count >= 10 then
    return false;
  end if;

  insert into public.phone_verify_quota (user_id, phone_hash)
  values (v_user_id, p_phone_hash);

  delete from public.phone_verify_quota
  where requested_at < now() - interval '7 days';

  return true;
end;
$$;

revoke all on function public.consume_phone_verify_quota(text) from public;
grant execute on function public.consume_phone_verify_quota(text) to authenticated;

comment on function public.consume_phone_verify_quota(text) is
  'SECURITY DEFINER quota gate for verify-phone Edge Function. 5 sends / 10 min / user; 10 / day / phone hash.';

-- ---------------------------------------------------------------------------
-- 2. Verification helpers and writer RPC
-- ---------------------------------------------------------------------------
create or replace function public.has_verified_whatsapp_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.whatsapp_phone is not null
      and p.whatsapp_verified_at is not null
  );
$$;

revoke all on function public.has_verified_whatsapp_user(uuid) from public, anon;
grant execute on function public.has_verified_whatsapp_user(uuid) to authenticated;

create or replace function public.has_verified_whatsapp()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_verified_whatsapp_user((select auth.uid()));
$$;

revoke all on function public.has_verified_whatsapp() from public, anon;
grant execute on function public.has_verified_whatsapp() to authenticated;

create or replace function public.set_whatsapp_verified(p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if public.is_banned() then
    raise exception 'Your account cannot verify a phone number';
  end if;

  if p_phone is null or p_phone !~ '^\+549[0-9]{8,11}$' then
    raise exception 'Invalid WhatsApp number';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.whatsapp_phone is distinct from p_phone then
    raise exception 'Phone number does not match your profile';
  end if;

  perform set_config('padelcito.profile_internal_update', 'true', true);

  update public.profiles
  set whatsapp_verified_at = now()
  where id = v_user_id;
end;
$$;

revoke all on function public.set_whatsapp_verified(text) from public, anon;
grant execute on function public.set_whatsapp_verified(text) to authenticated;

comment on function public.set_whatsapp_verified(text) is
  'Marks the caller WhatsApp as verified after OTP. Phone must match profiles.whatsapp_phone.';

-- ---------------------------------------------------------------------------
-- 3. Match create / join gates
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can host matches" on public.matches;

create policy "Authenticated users can host matches"
  on public.matches for insert
  to authenticated
  with check (
    host_id = (select auth.uid())
    and not public.is_banned()
    and public.has_verified_whatsapp()
  );

create or replace function public.validate_match_participant_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
begin
  select m.host_id into v_host_id
  from public.matches m
  where m.id = new.match_id;

  if v_host_id is null then
    raise exception 'Match not found';
  end if;

  if public.is_banned_user(new.profile_id) then
    raise exception 'Cannot join this match';
  end if;

  if public.users_are_blocked(new.profile_id, v_host_id) then
    raise exception 'Cannot join this match';
  end if;

  if not public.has_verified_whatsapp_user(new.profile_id) then
    raise exception 'Verify your WhatsApp number before joining a match';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Community publish gate
-- ---------------------------------------------------------------------------
create or replace function public.enforce_community_post_limits()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_pending_count integer;
  v_recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.is_banned() then
    raise exception 'Your account cannot publish community_posts';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.whatsapp_phone is null then
    raise exception 'Add a WhatsApp number to your profile before publishing a community post';
  end if;

  if v_profile.whatsapp_verified_at is null then
    raise exception 'Verify your WhatsApp number before publishing a community post';
  end if;

  new.contact_phone := v_profile.whatsapp_phone;
  new.contact_verified_at := v_profile.whatsapp_verified_at;
  new.author_id := auth.uid();
  new.status := 'pending_review';
  new.report_count := 0;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.published_at := null;
  new.rejection_reason := null;

  select count(*)::integer into v_pending_count
  from public.community_posts f
  where f.author_id = auth.uid()
    and f.status = 'pending_review';

  if v_pending_count >= 2 then
    raise exception 'You already have 2 community_posts awaiting review';
  end if;

  select count(*)::integer into v_recent_count
  from public.community_posts f
  where f.author_id = auth.uid()
    and f.created_at >= now() - interval '24 hours';

  if v_recent_count >= 5 then
    raise exception 'You can publish at most 5 community_posts per 24 hours';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. public_profiles — boolean verification badge only
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
  commitment_count,
  (whatsapp_verified_at is not null) as whatsapp_verified,
  case
    when gender in ('male', 'female') then gender
    else null
  end as gender,
  case
    when birth_date is not null
    then extract(year from age(birth_date))::smallint
    else null
  end as age_years,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Public read surface. whatsapp_verified is boolean only; phone and verification timestamp are never exposed.';
