-- Notify moderators when a community post is submitted or returns to the review queue.

alter type public.notification_type add value if not exists 'community_post_submitted';

create or replace function public.notify_moderators_community_post_submitted()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_author_name text;
  v_moderator_id uuid;
begin
  if new.status <> 'pending_review' then
    return new;
  end if;

  select coalesce(pp.display_name, 'Player') into v_author_name
  from public.public_profiles pp
  where pp.id = new.author_id;

  for v_moderator_id in
    select p.id
    from public.profiles p
    where p.role in ('moderator', 'admin')
      and p.id is distinct from new.author_id
  loop
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      community_post_id,
      data
    )
    values (
      v_moderator_id,
      new.author_id,
      'community_post_submitted'::public.notification_type,
      new.id,
      jsonb_build_object(
        'post_title', new.title,
        'venue_name', new.venue_name,
        'actor_name', coalesce(v_author_name, 'Player')
      )
    );
  end loop;

  return new;
end;
$$;

revoke all on function public.notify_moderators_community_post_submitted() from public, anon, authenticated;

create trigger trg_notify_moderators_community_post_inserted
  after insert on public.community_posts
  for each row
  when (new.status = 'pending_review')
  execute function public.notify_moderators_community_post_submitted();

create trigger trg_notify_moderators_community_post_resubmitted
  after update of status on public.community_posts
  for each row
  when (
    new.status = 'pending_review'
    and old.status is distinct from new.status
  )
  execute function public.notify_moderators_community_post_submitted();
