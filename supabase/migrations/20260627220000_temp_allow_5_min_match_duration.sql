-- TEMP: allow 5-minute matches for local testing.
-- Revert by dropping this migration and restoring check (duration_minutes between 15 and 480).

alter table public.matches
  drop constraint if exists matches_duration_minutes_check;

alter table public.matches
  add constraint matches_duration_minutes_check
  check (duration_minutes between 5 and 480);
