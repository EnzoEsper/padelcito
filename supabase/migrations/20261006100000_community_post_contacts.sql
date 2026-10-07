-- Organizer WhatsApp contacts per community post (1–3); moderator confirmation before approval.

create table public.community_post_contacts (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.community_posts (id) on delete cascade,
  position      smallint not null check (position between 0 and 2),
  phone         text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  label         text check (label is null or char_length(label) between 1 and 40),
  is_author_phone boolean not null default false,
  confirmed_at  timestamptz,
  confirmed_by  uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (post_id, position),
  unique (post_id, phone)
);

create index idx_community_post_contacts_post_id
  on public.community_post_contacts (post_id);

comment on table public.community_post_contacts is
  'Organizer WhatsApp numbers for a community post (1–3). Public sees confirmed rows on approved posts only.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_community_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_posts f
    where f.id = p_post_id
      and (
        f.author_id = (select auth.uid())
        or public.is_moderator()
      )
  );
$$;

revoke all on function public.can_manage_community_post(uuid) from public, anon;
grant execute on function public.can_manage_community_post(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.community_post_contacts enable row level security;

revoke all on public.community_post_contacts from anon, authenticated;
grant select on public.community_post_contacts to anon, authenticated;

create policy "Contacts visible when confirmed on approved post or manageable"
  on public.community_post_contacts for select
  to anon, authenticated
  using (
    public.can_manage_community_post(post_id)
    or (
      confirmed_at is not null
      and exists (
        select 1
        from public.community_posts f
        where f.id = post_id
          and f.status = 'approved'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- set_community_post_contacts (author, pending/rejected only)
-- ---------------------------------------------------------------------------

create or replace function public.set_community_post_contacts(
  p_post_id uuid,
  p_contacts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.community_posts%rowtype;
  v_profile public.profiles%rowtype;
  v_count integer;
  v_row jsonb;
  v_pos integer;
  v_phone text;
  v_label text;
  v_old_confirmed timestamptz;
  v_old_confirmed_by uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_post from public.community_posts where id = p_post_id;
  if not found then
    raise exception 'Community post not found';
  end if;

  if v_post.author_id <> auth.uid() then
    raise exception 'Only the author can update organizer contacts';
  end if;

  if v_post.status not in ('pending_review', 'rejected') then
    raise exception 'Organizer contacts can only be edited while post is pending or rejected';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Profile not found';
  end if;

  if p_contacts is null then
    raise exception 'At least one organizer contact is required';
  end if;

  if jsonb_typeof(p_contacts) <> 'array' then
    raise exception 'Contacts payload must be a JSON array';
  end if;

  v_count := jsonb_array_length(p_contacts);
  if v_count < 1 or v_count > 3 then
    raise exception 'Between 1 and 3 organizer contacts are required';
  end if;

  for v_pos in 0 .. (v_count - 1) loop
    v_row := p_contacts -> v_pos;
    v_phone := v_row ->> 'phone';
    if v_phone is null or v_phone !~ '^\+[1-9][0-9]{6,14}$' then
      raise exception 'Invalid phone at position %', v_pos;
    end if;
    v_label := nullif(trim(v_row ->> 'label'), '');
    if v_label is not null and char_length(v_label) > 40 then
      raise exception 'Label too long at position %', v_pos;
    end if;
  end loop;

  create temp table _contact_confirm_preserve (
    phone text primary key,
    confirmed_at timestamptz,
    confirmed_by uuid
  ) on commit drop;

  insert into _contact_confirm_preserve (phone, confirmed_at, confirmed_by)
  select c.phone, c.confirmed_at, c.confirmed_by
  from public.community_post_contacts c
  where c.post_id = p_post_id;

  delete from public.community_post_contacts where post_id = p_post_id;

  for v_pos in 0 .. (v_count - 1) loop
    v_row := p_contacts -> v_pos;
    v_phone := v_row ->> 'phone';
    v_label := nullif(trim(v_row ->> 'label'), '');

    select p.confirmed_at, p.confirmed_by
      into v_old_confirmed, v_old_confirmed_by
    from _contact_confirm_preserve p
    where p.phone = v_phone;

    insert into public.community_post_contacts (
      post_id,
      position,
      phone,
      label,
      is_author_phone,
      confirmed_at,
      confirmed_by
    ) values (
      p_post_id,
      v_pos,
      v_phone,
      v_label,
      v_profile.whatsapp_phone is not null and v_phone = v_profile.whatsapp_phone,
      v_old_confirmed,
      v_old_confirmed_by
    );
  end loop;
end;
$$;

grant execute on function public.set_community_post_contacts(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- set_community_post_contact_confirmed (moderator)
-- ---------------------------------------------------------------------------

create or replace function public.set_community_post_contact_confirmed(
  p_contact_id uuid,
  p_confirmed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact public.community_post_contacts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_moderator() then
    raise exception 'Moderator access required';
  end if;

  select * into v_contact
  from public.community_post_contacts
  where id = p_contact_id;

  if not found then
    raise exception 'Contact not found';
  end if;

  if p_confirmed then
    update public.community_post_contacts
    set confirmed_at = now(),
        confirmed_by = auth.uid()
    where id = p_contact_id;
  else
    update public.community_post_contacts
    set confirmed_at = null,
        confirmed_by = null
    where id = p_contact_id;
  end if;
end;
$$;

grant execute on function public.set_community_post_contact_confirmed(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Approval gate: at least one confirmed contact
-- ---------------------------------------------------------------------------

create or replace function public.enforce_community_post_approval_contacts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confirmed_count integer;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select count(*)::integer into v_confirmed_count
    from public.community_post_contacts c
    where c.post_id = new.id
      and c.confirmed_at is not null;

    if v_confirmed_count < 1 then
      raise exception 'Cannot approve community post without at least one confirmed organizer contact';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_community_post_approval_contacts
  before update on public.community_posts
  for each row execute function public.enforce_community_post_approval_contacts();

-- ---------------------------------------------------------------------------
-- Legacy: backfill contacts, nullable contact_phone, publish trigger
-- ---------------------------------------------------------------------------

insert into public.community_post_contacts (
  post_id,
  position,
  phone,
  is_author_phone,
  confirmed_at,
  confirmed_by
)
select
  f.id,
  0,
  f.contact_phone,
  true,
  case
    when f.status = 'approved' then coalesce(f.reviewed_at, f.published_at, now())
    else null
  end,
  case when f.status = 'approved' then f.reviewed_by else null end
from public.community_posts f
where f.contact_phone is not null
  and not exists (
    select 1 from public.community_post_contacts c where c.post_id = f.id
  );

alter table public.community_posts
  alter column contact_phone drop not null;

comment on column public.community_posts.contact_phone is
  'Deprecated. Organizer numbers live in community_post_contacts. Null for new posts.';

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

  if v_profile.whatsapp_verified_at is null then
    raise exception 'Verify your WhatsApp number before publishing a community post';
  end if;

  new.contact_phone := null;
  new.contact_verified_at := null;
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
