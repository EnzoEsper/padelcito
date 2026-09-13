-- Fix list_banned_users: username is citext in profiles but RPC declared text.
-- PostgREST returns 42804 when any banned row is returned without an explicit cast.

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
