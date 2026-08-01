-- Rate limiting for Google Places proxy (Edge Function calls consume_places_search_quota).

create table public.places_search_rate_limits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now()
);

create index idx_places_search_rate_limits_user_requested
  on public.places_search_rate_limits (user_id, requested_at desc);

alter table public.places_search_rate_limits enable row level security;

-- No direct client access; Edge Function uses SECURITY DEFINER RPC only.
create policy places_search_rate_limits_no_client
  on public.places_search_rate_limits
  for all
  to authenticated, anon
  using (false)
  with check (false);

comment on table public.places_search_rate_limits is
  'Append-only audit of Places search proxy calls for per-user rate limiting.';

-- Returns true when the caller may proceed; false when over quota (HTTP 429).
create or replace function public.consume_places_search_quota(
  p_limit int default 20,
  p_window_seconds int default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count int;
  v_window_start timestamptz;
begin
  if v_user_id is null then
    return false;
  end if;

  v_window_start := now() - make_interval(secs => p_window_seconds);

  select count(*)::int
  into v_count
  from public.places_search_rate_limits r
  where r.user_id = v_user_id
    and r.requested_at >= v_window_start;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.places_search_rate_limits (user_id)
  values (v_user_id);

  -- Opportunistic cleanup of rows older than 24 h (keeps the table small).
  delete from public.places_search_rate_limits
  where requested_at < now() - interval '24 hours';

  return true;
end;
$$;

revoke all on function public.consume_places_search_quota(int, int) from public;
grant execute on function public.consume_places_search_quota(int, int) to authenticated;

comment on function public.consume_places_search_quota(int, int) is
  'SECURITY DEFINER quota gate for places-search Edge Function. Default: 20 requests per 60 s per user.';
