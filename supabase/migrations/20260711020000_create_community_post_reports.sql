-- Post-publish community post abuse reports.

create type public.community_post_report_reason as enum (
  'spam',
  'inappropriate',
  'scam',
  'misleading',
  'other'
);

create table public.community_post_reports (
  id           uuid primary key default gen_random_uuid(),
  community_post_id     uuid not null references public.community_posts (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       public.community_post_report_reason not null,
  comment      text check (comment is null or char_length(comment) <= 500),
  created_at   timestamptz not null default now(),
  unique (community_post_id, reporter_id)
);

create index idx_community_post_reports_community_post_id on public.community_post_reports (community_post_id);
create index idx_community_post_reports_reporter_id on public.community_post_reports (reporter_id);

-- ---------------------------------------------------------------------------
-- Bump report_count; auto re-review at threshold
-- ---------------------------------------------------------------------------
create or replace function public.apply_community_post_report()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_author_id uuid;
  v_new_count integer;
begin
  select f.author_id into v_author_id
  from public.community_posts f
  where f.id = new.community_post_id;

  if v_author_id = new.reporter_id then
    raise exception 'Authors cannot report their own community_posts';
  end if;

  update public.community_posts f
  set report_count = f.report_count + 1,
      status = case
        when f.status = 'approved' and f.report_count + 1 >= 3 then 'pending_review'::public.community_post_status
        else f.status
      end,
      updated_at = now()
  where f.id = new.community_post_id
  returning f.report_count into v_new_count;

  return new;
end;
$$;

create trigger trg_apply_community_post_report
  after insert on public.community_post_reports
  for each row execute function public.apply_community_post_report();

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.community_post_reports enable row level security;

revoke all on public.community_post_reports from anon, authenticated;
grant select, insert on public.community_post_reports to authenticated;

create policy "Reporters and moderators can read community post reports"
  on public.community_post_reports for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_moderator()
  );

create policy "Users can report community_posts as themselves"
  on public.community_post_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));
