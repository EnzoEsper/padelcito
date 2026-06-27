-- In-app notifications for match lifecycle events.
-- Realtime publication justified: badge count + list must update live without polling.

-- ---------------------------------------------------------------------------
-- 1. Enum + table
-- ---------------------------------------------------------------------------
create type public.notification_type as enum (
  'join_request',
  'join_accepted',
  'join_rejected',
  'participant_withdrawn',
  'participant_removed',
  'match_cancelled'
);

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  recipient_id    uuid not null references auth.users (id) on delete cascade,
  actor_id        uuid references auth.users (id) on delete set null,
  type            public.notification_type not null,
  match_id        uuid references public.matches (id) on delete cascade,
  participant_id  uuid references public.match_participants (id) on delete set null,
  data            jsonb not null default '{}'::jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.notifications is
  'In-app notification inbox; rows inserted only by SECURITY DEFINER triggers.';

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
create index idx_notifications_recipient_id
  on public.notifications (recipient_id);

create index idx_notifications_recipient_unread
  on public.notifications (recipient_id)
  where read_at is null;

create index idx_notifications_match_id
  on public.notifications (match_id);

-- ---------------------------------------------------------------------------
-- 3. RLS + grants
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select, update on public.notifications to authenticated;

create policy "Recipients can read own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = (select auth.uid()));

create policy "Recipients can mark notifications read"
  on public.notifications for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Field guard — clients may only toggle read_at
-- ---------------------------------------------------------------------------
create or replace function public.protect_notification_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.recipient_id is distinct from old.recipient_id
     or new.actor_id is distinct from old.actor_id
     or new.type is distinct from old.type
     or new.match_id is distinct from old.match_id
     or new.participant_id is distinct from old.participant_id
     or new.data is distinct from old.data
     or new.created_at is distinct from old.created_at then
    raise exception 'Only read_at may be updated on notifications';
  end if;

  return new;
end;
$$;

create trigger trg_protect_notification_fields
  before update on public.notifications
  for each row
  execute function public.protect_notification_fields();

-- ---------------------------------------------------------------------------
-- 5. emit_notification — single fan-out helper for triggers (and future push)
-- ---------------------------------------------------------------------------
create or replace function public.emit_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type public.notification_type,
  p_match_id uuid,
  p_participant_id uuid default null,
  p_extra jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_actor_name text;
  v_participant public.match_participants%rowtype;
  v_data jsonb;
  v_notification_id uuid;
begin
  if p_recipient_id is null then
    return null;
  end if;

  if p_recipient_id = p_actor_id then
    return null;
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id;

  if not found then
    return null;
  end if;

  select coalesce(pp.display_name, 'Player') into v_actor_name
  from public.public_profiles pp
  where pp.id = p_actor_id;

  v_data := jsonb_build_object(
    'match_title', v_match.title,
    'venue_name', v_match.venue_name,
    'actor_name', coalesce(v_actor_name, 'Player')
  ) || coalesce(p_extra, '{}'::jsonb);

  if p_participant_id is not null then
    select * into v_participant
    from public.match_participants
    where id = p_participant_id;

    if found then
      v_data := v_data || jsonb_build_object(
        'was_late_withdrawal', coalesce(v_participant.was_late_withdrawal, false),
        'was_removed_by_host', coalesce(v_participant.was_removed_by_host, false)
      );
    end if;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    match_id,
    participant_id,
    data
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_match_id,
    p_participant_id,
    v_data
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.emit_notification(uuid, uuid, public.notification_type, uuid, uuid, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Realtime
-- ---------------------------------------------------------------------------
alter table public.notifications replica identity full;

alter publication supabase_realtime add table public.notifications;
