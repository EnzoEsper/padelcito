-- Community community_posts: moderated tournament/training announcements.

create type public.community_post_type as enum ('tournament', 'training');

create type public.community_post_status as enum (
  'pending_review',
  'approved',
  'rejected',
  'archived'
);

create table public.community_posts (
  id                  uuid primary key default gen_random_uuid(),
  author_id           uuid not null references public.profiles (id) on delete cascade,
  sport_id            uuid not null references public.sports (id) on delete restrict,
  type                public.community_post_type not null,
  title               text not null check (char_length(title) between 3 and 120),
  description         text check (description is null or char_length(description) <= 4000),
  image_path          text,
  location            extensions.geography(point, 4326) not null,
  venue_name          text,
  formatted_address   text,
  event_start         timestamptz,
  event_end           timestamptz,
  contact_phone       text not null check (contact_phone ~ '^\+[1-9][0-9]{6,14}$'),
  contact_verified_at timestamptz,
  details             jsonb not null default '{}'::jsonb,
  status              public.community_post_status not null default 'pending_review',
  rejection_reason    text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  reviewed_by         uuid references public.profiles (id) on delete set null,
  reviewed_at         timestamptz,
  published_at        timestamptz,
  report_count        integer not null default 0 check (report_count >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (event_end is null or event_start is null or event_end >= event_start)
);

comment on table public.community_posts is
  'Community board community_posts. Contact phone is a snapshot of the author profile number at publish time.';
comment on column public.community_posts.contact_phone is
  'Public contact on approved community_posts. Set by trigger from profiles.whatsapp_phone — never free-typed.';
comment on column public.community_posts.contact_verified_at is
  'Snapshot of profiles.whatsapp_verified_at at publish time for verified-contact badge.';

create index idx_community_posts_author_id on public.community_posts (author_id);
create index idx_community_posts_sport_id on public.community_posts (sport_id);
create index idx_community_posts_status on public.community_posts (status);
create index idx_community_posts_location on public.community_posts using gist (location);
create index idx_community_posts_approved_upcoming
  on public.community_posts (event_start nulls last, created_at desc)
  where status = 'approved';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_community_post_author(p_community_post_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.community_posts f
    where f.id = p_community_post_id and f.author_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Anti-spam + contact snapshot on insert
-- ---------------------------------------------------------------------------
create or replace function public.enforce_community_post_limits()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_pending_count integer;
  v_recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.is_banned() then
    raise exception 'Your account cannot publish community_posts';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.whatsapp_phone is null then
    raise exception 'Add a WhatsApp number to your profile before publishing a community post';
  end if;

  -- Force contact snapshot from the author's own profile number.
  new.contact_phone := v_profile.whatsapp_phone;
  new.contact_verified_at := v_profile.whatsapp_verified_at;
  new.author_id := auth.uid();
  new.status := 'pending_review';
  new.report_count := 0;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.published_at := null;
  new.rejection_reason := null;

  select count(*)::integer into v_pending_count
  from public.community_posts f
  where f.author_id = auth.uid()
    and f.status = 'pending_review';

  if v_pending_count >= 2 then
    raise exception 'You already have 2 community_posts awaiting review';
  end if;

  select count(*)::integer into v_recent_count
  from public.community_posts f
  where f.author_id = auth.uid()
    and f.created_at >= now() - interval '24 hours';

  if v_recent_count >= 5 then
    raise exception 'You can publish at most 5 community_posts per 24 hours';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_community_post_limits
  before insert on public.community_posts
  for each row execute function public.enforce_community_post_limits();

-- ---------------------------------------------------------------------------
-- Field guards on update
-- ---------------------------------------------------------------------------
create or replace function public.protect_community_post_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_moderator() then
    if new.status is distinct from old.status
       and new.status in ('approved', 'rejected') then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      if new.status = 'approved' then
        new.published_at := coalesce(new.published_at, now());
        new.rejection_reason := null;
      end if;
    end if;
    return new;
  end if;

  if old.author_id <> auth.uid() then
    raise exception 'Only the author or a moderator can update this community post';
  end if;

  if new.status = 'archived' and old.status = 'approved' then
    return new;
  end if;

  if old.status not in ('pending_review', 'rejected') then
    raise exception 'This community post can no longer be edited';
  end if;

  if new.status = 'approved' then
    raise exception 'Only a moderator can approve community_posts';
  end if;

  -- Author may resubmit rejected community_posts for review.
  if old.status = 'rejected' and new.status = 'pending_review' then
    new.rejection_reason := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.published_at := null;
  elsif new.status not in ('pending_review', 'rejected', 'archived') then
    raise exception 'Invalid community post status for author update: %', new.status;
  end if;

  -- Immutable ownership + contact snapshot fields.
  new.author_id := old.author_id;
  new.contact_phone := old.contact_phone;
  new.contact_verified_at := old.contact_verified_at;
  new.report_count := old.report_count;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.published_at := old.published_at;
  new.rejection_reason := old.rejection_reason;
  new.created_at := old.created_at;

  return new;
end;
$$;

create trigger trg_protect_community_post_fields
  before update on public.community_posts
  for each row execute function public.protect_community_post_fields();

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger trg_community_posts_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.community_posts enable row level security;

revoke all on public.community_posts from anon, authenticated;
grant select, insert, update, delete on public.community_posts to anon, authenticated;

create policy "Approved community_posts are publicly readable"
  on public.community_posts for select
  to anon, authenticated
  using (
    status = 'approved'
    or author_id = (select auth.uid())
    or public.is_moderator()
  );

create policy "Authenticated users can submit community_posts"
  on public.community_posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and not public.is_banned()
    and status = 'pending_review'
  );

create policy "Authors and moderators can update community_posts"
  on public.community_posts for update
  to authenticated
  using (author_id = (select auth.uid()) or public.is_moderator())
  with check (author_id = (select auth.uid()) or public.is_moderator());

create policy "Authors and moderators can delete community_posts"
  on public.community_posts for delete
  to authenticated
  using (author_id = (select auth.uid()) or public.is_moderator());

-- ---------------------------------------------------------------------------
-- Discovery RPC — fixed-radius nearby approved community_posts
-- ---------------------------------------------------------------------------
create or replace function public.nearby_community_posts(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m integer default 50000,
  p_sport_id uuid default null,
  p_type     public.community_post_type default null
)
returns table (
  id          uuid,
  title       text,
  type        public.community_post_type,
  sport_id    uuid,
  author_id   uuid,
  venue_name  text,
  event_start timestamptz,
  event_end   timestamptz,
  image_path  text,
  distance_m  double precision
)
language sql stable
set search_path = public, extensions
as $$
  select
    f.id,
    f.title,
    f.type,
    f.sport_id,
    f.author_id,
    f.venue_name,
    f.event_start,
    f.event_end,
    f.image_path,
    extensions.st_distance(
      f.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    ) as distance_m
  from public.community_posts f
  where f.status = 'approved'
    and (p_sport_id is null or f.sport_id = p_sport_id)
    and (p_type is null or f.type = p_type)
    and (f.event_end is null or f.event_end >= now())
    and extensions.st_dwithin(
      f.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  order by distance_m, f.event_start nulls last, f.created_at desc;
$$;

grant execute on function public.nearby_community_posts(double precision, double precision, integer, uuid, public.community_post_type)
  to anon, authenticated;

revoke all on function public.is_community_post_author(uuid) from public, anon;
