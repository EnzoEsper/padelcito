-- Store compliance: user blocks, account deletion, join/contact gating.

-- ---------------------------------------------------------------------------
-- 1. user_blocks
-- ---------------------------------------------------------------------------
create table public.user_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index idx_user_blocks_blocker on public.user_blocks (blocker_id);
create index idx_user_blocks_blocked on public.user_blocks (blocked_id);

comment on table public.user_blocks is
  'User-to-user blocks for UGC safety (Apple Guideline 1.2). Either direction prevents match join and contact.';

alter table public.user_blocks enable row level security;

grant select, insert, delete on public.user_blocks to authenticated;

create policy "Users view their own blocks"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Users can block others"
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "Users can unblock"
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Block helpers
-- ---------------------------------------------------------------------------
create or replace function public.users_are_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks ub
    where (ub.blocker_id = p_user_a and ub.blocked_id = p_user_b)
       or (ub.blocker_id = p_user_b and ub.blocked_id = p_user_a)
  );
$$;

revoke all on function public.users_are_blocked(uuid, uuid) from public, anon;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

create or replace function public.block_user(p_blocked_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Authentication required';
  end if;

  if p_blocked_id is null or p_blocked_id = v_caller then
    raise exception 'Invalid user to block';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_caller, p_blocked_id)
  on conflict (blocker_id, blocked_id) do nothing;
end;
$$;

create or replace function public.unblock_user(p_blocked_id uuid)
returns void
language plpgsql security definer set search_path = public
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
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unblock_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Join-request gating when users are blocked
-- ---------------------------------------------------------------------------
create or replace function public.validate_match_participant_insert()
returns trigger
language plpgsql security definer set search_path = public
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

  if public.users_are_blocked(new.profile_id, v_host_id) then
    raise exception 'Cannot join this match';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_match_participant_insert on public.match_participants;

create trigger trg_validate_match_participant_insert
  before insert on public.match_participants
  for each row execute function public.validate_match_participant_insert();

-- ---------------------------------------------------------------------------
-- 4. match_contact_details — block check
-- ---------------------------------------------------------------------------
create or replace function public.match_contact_details(p_match_id uuid)
returns table (
  profile_id     uuid,
  display_name   text,
  whatsapp_phone text,
  whatsapp_link  text
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_match_member(p_match_id) then
    raise exception 'Only the host and accepted participants can access contact details';
  end if;

  if not public.is_match_active(p_match_id) then
    raise exception 'Contact details are not available for finished or cancelled matches';
  end if;

  select m.host_id into v_host_id
  from public.matches m
  where m.id = p_match_id;

  if v_host_id is null then
    raise exception 'Match not found';
  end if;

  if public.users_are_blocked(v_caller_id, v_host_id) then
    raise exception 'Contact is not available for this match';
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
    select v_host_id
    where v_caller_id <> v_host_id
    union
    select mp.profile_id
    from public.match_participants mp
    where mp.match_id = p_match_id
      and mp.status = 'accepted'
      and v_caller_id = v_host_id
      and mp.profile_id <> v_host_id
      and not public.users_are_blocked(v_caller_id, mp.profile_id)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. delete_account — in-app account deletion (Apple 5.1.1 / Google Play)
-- ---------------------------------------------------------------------------
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

comment on function public.delete_account() is
  'Deletes the authenticated auth.users row; profile and owned data cascade per FK rules.';
