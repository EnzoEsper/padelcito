-- Schedule deterministic match finalization via pg_cron (every 2 minutes).
-- finalize_due_matches() remains callable directly for local testing.

create extension if not exists pg_cron with schema pg_catalog;

do $padel$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'finalize-due-matches'
  ) then
    perform cron.schedule(
      'finalize-due-matches',
      '*/2 * * * *',
      $cron$ select public.finalize_due_matches(); $cron$
    );
  end if;
end;
$padel$;
