-- Role helpers are referenced in community_posts RLS policies. Revoking from PUBLIC removed
-- EXECUTE for authenticated as well; restore client access.

grant execute on function public.is_moderator() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_banned() to authenticated;
