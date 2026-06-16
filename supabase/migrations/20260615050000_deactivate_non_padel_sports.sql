-- MVP: Padelcito manages padel only. Other sports remain in the catalog for future use.
-- Re-enabling a sport requires: is_active = true + explicit client multi-sport work.

update public.sports
set is_active = false
where slug <> 'padel';
