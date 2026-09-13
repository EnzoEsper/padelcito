-- Moderator ban management: list platform-banned users for in-app review and unban.

create or replace function public.list_banned_users()
returns table (
  user_id uuid,
  display_name text,
  username text,
  banned_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can list banned users';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.username::text,
    p.banned_at
  from public.profiles p
  where p.banned_at is not null
    and p.role <> 'admin'
  order by p.banned_at desc;
end;
$$;

revoke all on function public.list_banned_users() from public, anon;
grant execute on function public.list_banned_users() to authenticated;

comment on function public.list_banned_users() is
  'Moderator-only roster of platform-banned users (banned_at set), newest first.';
