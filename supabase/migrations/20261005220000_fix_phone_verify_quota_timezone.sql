-- Fix daily quota boundary: America/Argentina_Buenos_Aires is not a valid PG timezone.
-- Use IANA America/Buenos_Aires (Argentina local calendar day for per-number daily cap).

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
