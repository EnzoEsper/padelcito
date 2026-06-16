-- Restore Data API access for anon/authenticated when auto_expose_new_tables = false.
-- RLS policies remain the actual authorization layer.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Client-facing RPCs (discovery + match flows)
grant execute on function public.nearby_matches(double precision, double precision, integer, uuid)
  to anon, authenticated;

grant execute on function public.nearby_listings(double precision, double precision, integer, public.listing_type, uuid)
  to anon, authenticated;

grant execute on function public.nearby_tournaments(double precision, double precision, integer, uuid)
  to anon, authenticated;

-- Already granted in 0001, repeated here for idempotency clarity:
grant execute on function public.match_contact_details(uuid) to authenticated;
grant execute on function public.generate_single_elimination_bracket(uuid) to authenticated;
grant execute on function public.generate_round_robin(uuid) to authenticated;
