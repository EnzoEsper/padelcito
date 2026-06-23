-- sync_match_lifecycle must not require host/participant relationship.
-- Discover viewers opening a public match detail need lifecycle sync too.

create or replace function public.sync_match_lifecycle(p_match_id uuid)
returns public.match_status
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_ends_at timestamptz;
  v_new_status public.match_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;

  if not (
    public.is_match_host(p_match_id)
    or public.has_match_relationship(p_match_id)
    or v_match.is_public
  ) then
    raise exception 'Not authorized to sync this match';
  end if;

  v_ends_at := v_match.starts_at + make_interval(mins => v_match.duration_minutes);
  v_new_status := v_match.status;

  if v_match.status in ('open', 'full') then
    if v_ends_at <= now() then
      v_new_status := 'completed';
    elsif v_match.starts_at <= now() then
      v_new_status := 'in_progress';
    end if;
  elsif v_match.status = 'in_progress' and v_ends_at <= now() then
    v_new_status := 'completed';
  end if;

  if v_new_status <> v_match.status then
    update public.matches
    set status = v_new_status
    where id = p_match_id;
  end if;

  return v_new_status;
end;
$$;

revoke execute on function public.sync_match_lifecycle(uuid) from public, anon;
grant execute on function public.sync_match_lifecycle(uuid) to authenticated;
