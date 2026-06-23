-- Rename match_status 'completed' -> 'finished' and align lifecycle + contact rules.
-- Safe on empty DB; on existing data, run after ensuring no 'completed' rows remain
-- or rely on ALTER TYPE ... RENAME VALUE.

alter type public.match_status rename value 'completed' to 'finished';

-- Treat finished matches as inactive for contact reveal (cancelled already excluded).
create or replace function public.is_match_active(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and m.status not in ('cancelled', 'finished')
  );
$$;

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
      v_new_status := 'finished';
    elsif v_match.starts_at <= now() then
      v_new_status := 'in_progress';
    end if;
  elsif v_match.status = 'in_progress' and v_ends_at <= now() then
    v_new_status := 'finished';
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

create or replace function public.validate_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
begin
  select * into v_match from public.matches where id = new.match_id;
  if not found then
    raise exception 'Match % does not exist', new.match_id;
  end if;

  if new.context = 'standard' then
    if v_match.status <> 'finished' then
      raise exception 'Standard ratings are only allowed after the match is finished';
    end if;
    if not public.is_match_member_of(new.match_id, new.rater_id)
       or not public.is_match_member_of(new.match_id, new.ratee_id) then
      raise exception 'Standard ratings require both rater and ratee to be match members';
    end if;

  elsif new.context = 'late_withdrawal' then
    if not exists (
      select 1 from public.match_participants mp
      where mp.match_id = new.match_id
        and mp.profile_id = new.ratee_id
        and mp.was_late_withdrawal
    ) then
      raise exception 'late_withdrawal ratings require the ratee to have a late-withdrawal flag on this match';
    end if;
    if not public.is_match_member_of(new.match_id, new.rater_id)
       and new.rater_id <> v_match.host_id then
      raise exception 'Only match members can submit late_withdrawal ratings';
    end if;

  elsif new.context = 'host_removal' then
    if new.ratee_id <> v_match.host_id then
      raise exception 'host_removal ratings must target the match host';
    end if;
    if not exists (
      select 1 from public.match_participants mp
      where mp.match_id = new.match_id
        and mp.profile_id = new.rater_id
        and mp.was_removed_by_host
    ) then
      raise exception 'host_removal ratings require the rater to have been removed within the penalty window';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.match_contact_details(p_match_id uuid)
returns table (
  profile_id    uuid,
  display_name  text,
  whatsapp_phone text,
  whatsapp_link text
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_match_member(p_match_id) then
    raise exception 'Only the host and accepted participants can access contact details';
  end if;
  if not public.is_match_active(p_match_id) then
    raise exception 'Contact details are not available for finished or cancelled matches';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.whatsapp_phone,
    case when p.whatsapp_phone is not null
      then 'https://wa.me/' || regexp_replace(p.whatsapp_phone, '\D', '', 'g')
    end
  from public.profiles p
  where p.id in (
    select m.host_id from public.matches m where m.id = p_match_id
    union
    select mp.profile_id
    from public.match_participants mp
    where mp.match_id = p_match_id and mp.status = 'accepted'
  );
end;
$$;
