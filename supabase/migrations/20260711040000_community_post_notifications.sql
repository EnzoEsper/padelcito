-- Community post moderation notifications for authors.

alter type public.notification_type add value if not exists 'community_post_approved';
alter type public.notification_type add value if not exists 'community_post_rejected';

alter table public.notifications
  add column community_post_id uuid references public.community_posts (id) on delete cascade;

create index idx_notifications_community_post_id on public.notifications (community_post_id);

-- ---------------------------------------------------------------------------
-- emit_community_post_notification — author-only fan-out for community post lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.emit_community_post_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type public.notification_type,
  p_community_post_id uuid,
  p_extra jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_community_post public.community_posts%rowtype;
  v_actor_name text;
  v_data jsonb;
  v_notification_id uuid;
begin
  if p_recipient_id is null or p_community_post_id is null then
    return null;
  end if;

  if p_type not in ('community_post_approved', 'community_post_rejected') then
    raise exception 'Invalid community post notification type: %', p_type;
  end if;

  select * into v_community_post
  from public.community_posts
  where id = p_community_post_id;

  if not found then
    return null;
  end if;

  select coalesce(pp.display_name, 'Moderator') into v_actor_name
  from public.public_profiles pp
  where pp.id = p_actor_id;

  v_data := jsonb_build_object(
    'post_title', v_community_post.title,
    'venue_name', v_community_post.venue_name,
    'actor_name', coalesce(v_actor_name, 'Moderator'),
    'rejection_reason', v_community_post.rejection_reason
  ) || coalesce(p_extra, '{}'::jsonb);

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    community_post_id,
    data
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_community_post_id,
    v_data
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.emit_community_post_notification(uuid, uuid, public.notification_type, uuid, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notify author on moderator approve/reject
-- ---------------------------------------------------------------------------
create or replace function public.notify_community_post_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if not public.is_moderator() then
    return new;
  end if;

  if new.status = 'approved' then
    perform public.emit_community_post_notification(
      new.author_id,
      auth.uid(),
      'community_post_approved'::public.notification_type,
      new.id
    );
  elsif new.status = 'rejected' then
    perform public.emit_community_post_notification(
      new.author_id,
      auth.uid(),
      'community_post_rejected'::public.notification_type,
      new.id
    );
  end if;

  return new;
end;
$$;

create trigger trg_notify_community_post_status_change
  after update of status on public.community_posts
  for each row execute function public.notify_community_post_status_change();
