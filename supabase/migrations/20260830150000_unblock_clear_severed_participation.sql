-- Unblock: clear severed participation rows so users can request again after unblock.

create or replace function public.clear_severed_participation(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_a is null or p_b is null or p_a = p_b then
    return;
  end if;

  delete from public.match_participants mp
  using public.matches m
  where mp.match_id = m.id
    and mp.status in ('removed', 'withdrawn')
    and m.status in ('open', 'full')
    and m.starts_at > now()
    and (
      (m.host_id = p_a and mp.profile_id = p_b)
      or (m.host_id = p_b and mp.profile_id = p_a)
      or (
        mp.profile_id in (p_a, p_b)
        and m.host_id not in (p_a, p_b)
        and exists (
          select 1
          from public.match_participants mp2
          where mp2.match_id = m.id
            and mp2.profile_id = case when mp.profile_id = p_a then p_b else p_a end
        )
      )
    );
end;
$$;

revoke all on function public.clear_severed_participation(uuid, uuid) from public, anon;
grant execute on function public.clear_severed_participation(uuid, uuid) to authenticated;

comment on function public.clear_severed_participation(uuid, uuid) is
  'Deletes removed/withdrawn participation rows between two users for upcoming matches so re-request is possible after unblock.';

create or replace function public.unblock_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Authentication required';
  end if;

  delete from public.user_blocks
  where blocker_id = v_caller
    and blocked_id = p_blocked_id;

  perform public.clear_severed_participation(v_caller, p_blocked_id);
end;
$$;
