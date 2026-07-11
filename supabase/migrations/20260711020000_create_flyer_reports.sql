-- Post-publish flyer abuse reports.

create type public.flyer_report_reason as enum (
  'spam',
  'inappropriate',
  'scam',
  'misleading',
  'other'
);

create table public.flyer_reports (
  id           uuid primary key default gen_random_uuid(),
  flyer_id     uuid not null references public.flyers (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       public.flyer_report_reason not null,
  comment      text check (comment is null or char_length(comment) <= 500),
  created_at   timestamptz not null default now(),
  unique (flyer_id, reporter_id)
);

create index idx_flyer_reports_flyer_id on public.flyer_reports (flyer_id);
create index idx_flyer_reports_reporter_id on public.flyer_reports (reporter_id);

-- ---------------------------------------------------------------------------
-- Bump report_count; auto re-review at threshold
-- ---------------------------------------------------------------------------
create or replace function public.apply_flyer_report()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_author_id uuid;
  v_new_count integer;
begin
  select f.author_id into v_author_id
  from public.flyers f
  where f.id = new.flyer_id;

  if v_author_id = new.reporter_id then
    raise exception 'Authors cannot report their own flyers';
  end if;

  update public.flyers f
  set report_count = f.report_count + 1,
      status = case
        when f.status = 'approved' and f.report_count + 1 >= 3 then 'pending_review'::public.flyer_status
        else f.status
      end,
      updated_at = now()
  where f.id = new.flyer_id
  returning f.report_count into v_new_count;

  return new;
end;
$$;

create trigger trg_apply_flyer_report
  after insert on public.flyer_reports
  for each row execute function public.apply_flyer_report();

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.flyer_reports enable row level security;

revoke all on public.flyer_reports from anon, authenticated;
grant select, insert on public.flyer_reports to authenticated;

create policy "Reporters and moderators can read flyer reports"
  on public.flyer_reports for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_moderator()
  );

create policy "Users can report flyers as themselves"
  on public.flyer_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));
