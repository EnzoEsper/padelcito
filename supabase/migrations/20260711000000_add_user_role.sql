-- Platform roles for moderation and admin actions.

create type public.user_role as enum ('member', 'moderator', 'admin');

alter table public.profiles
  add column role public.user_role not null default 'member',
  add column banned_at timestamptz,
  add column whatsapp_verified_at timestamptz;

comment on column public.profiles.role is
  'Platform role. Moderators review community flyers; admins are reserved for future use.';
comment on column public.profiles.banned_at is
  'When set, the user cannot publish community flyers.';
comment on column public.profiles.whatsapp_verified_at is
  'Set when phone OTP verification ships. Drives verified-contact badges on flyers.';

create index idx_profiles_role on public.profiles (role) where role <> 'member';

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_moderator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('moderator', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.is_banned()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.banned_at is not null
  );
$$;

-- Moderators may ban/unban users (not themselves, not admins).
create or replace function public.set_user_banned(
  p_user_id uuid,
  p_banned boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_moderator() then
    raise exception 'Only moderators can ban users';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot ban yourself';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.role = 'admin'
  ) then
    raise exception 'Cannot ban an admin';
  end if;

  update public.profiles
  set banned_at = case when p_banned then now() else null end,
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.set_user_banned(uuid, boolean) from public, anon;
grant execute on function public.set_user_banned(uuid, boolean) to authenticated;

revoke all on function public.is_moderator() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_banned() from public, anon;
