-- User abuse reports for UGC safety (Apple Guideline 1.2 / Play).

alter type public.notification_type add value if not exists 'user_reported';

-- ---------------------------------------------------------------------------
-- 1. user_report_reason + user_reports
-- ---------------------------------------------------------------------------
create type public.user_report_reason as enum (
  'harassment',
  'inappropriate',
  'spam',
  'scam',
  'safety',
  'other'
);

create table public.user_reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references public.profiles (id) on delete cascade,
  reported_id       uuid not null references public.profiles (id) on delete cascade,
  reason            public.user_report_reason not null,
  comment           text check (comment is null or char_length(comment) <= 500),
  match_id          uuid references public.matches (id) on delete set null,
  community_post_id uuid references public.community_posts (id) on delete set null,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz,
  reviewed_by       uuid references public.profiles (id) on delete set null,
  check (reporter_id <> reported_id)
);

create index idx_user_reports_reported_id on public.user_reports (reported_id);
create index idx_user_reports_reporter_id on public.user_reports (reporter_id);
create index idx_user_reports_open on public.user_reports (reported_id) where resolved_at is null;

create unique index idx_user_reports_open_pair
  on public.user_reports (reporter_id, reported_id)
  where resolved_at is null;

comment on table public.user_reports is
  'User-to-user abuse reports; moderators review open rows. One open report per reporter/reported pair.';

alter table public.user_reports enable row level security;

revoke all on public.user_reports from anon, authenticated;
grant select on public.user_reports to authenticated;

create policy "Reporters and moderators can read user reports"
  on public.user_reports for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_moderator()
  );

-- ---------------------------------------------------------------------------
-- 2. Moderator notifications on new user reports
-- ---------------------------------------------------------------------------
create or replace function public.notify_moderators_user_reported()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_name text;
  v_reported_name text;
  v_moderator_id uuid;
begin
  select coalesce(pp.display_name, 'Player') into v_reporter_name
  from public.public_profiles pp
  where pp.id = new.reporter_id;

  select coalesce(pp.display_name, 'Player') into v_reported_name
  from public.public_profiles pp
  where pp.id = new.reported_id;

  for v_moderator_id in
    select p.id
    from public.profiles p
    where p.role in ('moderator', 'admin')
      and p.id is distinct from new.reporter_id
      and p.id is distinct from new.reported_id
  loop
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      match_id,
      community_post_id,
      data
    )
    values (
      v_moderator_id,
      new.reporter_id,
      'user_reported'::public.notification_type,
      new.match_id,
      new.community_post_id,
      jsonb_build_object(
        'report_id', new.id,
        'reported_user_id', new.reported_id,
        'reported_user_name', coalesce(v_reported_name, 'Player'),
        'reporter_name', coalesce(v_reporter_name, 'Player'),
        'reason', new.reason::text
      )
    );
  end loop;

  return new;
end;
$$;

revoke all on function public.notify_moderators_user_reported() from public, anon, authenticated;

create trigger trg_notify_moderators_user_reported
  after insert on public.user_reports
  for each row
  when (new.resolved_at is null)
  execute function public.notify_moderators_user_reported();

-- ---------------------------------------------------------------------------
-- 3. report_user RPC
-- ---------------------------------------------------------------------------
create or replace function public.report_user(
  p_reported_id uuid,
  p_reason public.user_report_reason,
  p_comment text default null,
  p_match_id uuid default null,
  p_community_post_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_report_id uuid;
  v_comment text := nullif(trim(p_comment), '');
begin
  if v_caller is null then
    raise exception 'Authentication required';
  end if;

  if p_reported_id is null or p_reported_id = v_caller then
    raise exception 'Invalid user to report';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_reported_id) then
    raise exception 'User not found';
  end if;

  update public.user_reports ur
  set
    reason = p_reason,
    comment = v_comment,
    match_id = p_match_id,
    community_post_id = p_community_post_id,
    created_at = now()
  where ur.reporter_id = v_caller
    and ur.reported_id = p_reported_id
    and ur.resolved_at is null
  returning ur.id into v_report_id;

  if v_report_id is null then
    insert into public.user_reports (
      reporter_id,
      reported_id,
      reason,
      comment,
      match_id,
      community_post_id
    )
    values (
      v_caller,
      p_reported_id,
      p_reason,
      v_comment,
      p_match_id,
      p_community_post_id
    )
    returning id into v_report_id;
  end if;

  return v_report_id;
end;
$$;

revoke all on function public.report_user(uuid, public.user_report_reason, text, uuid, uuid)
  from public, anon;
grant execute on function public.report_user(uuid, public.user_report_reason, text, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 4. resolve_user_report RPC (moderators)
-- ---------------------------------------------------------------------------
create or replace function public.resolve_user_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_moderator() then
    raise exception 'Only moderators can resolve user reports';
  end if;

  update public.user_reports
  set
    resolved_at = now(),
    reviewed_by = auth.uid()
  where id = p_report_id
    and resolved_at is null;

  if not found then
    raise exception 'Report not found or already resolved';
  end if;
end;
$$;

revoke all on function public.resolve_user_report(uuid) from public, anon;
grant execute on function public.resolve_user_report(uuid) to authenticated;
