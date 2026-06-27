-- Notify the host when a player cancels a pending join request.

alter type public.notification_type add value if not exists 'join_request_cancelled';

create or replace function public.notify_participant_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_host_id uuid;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select host_id into v_host_id
  from public.matches
  where id = new.match_id;

  if old.status = 'pending' and new.status = 'accepted' then
    perform public.emit_notification(
      new.profile_id,
      v_host_id,
      'join_accepted',
      new.match_id,
      new.id
    );
  elsif old.status = 'pending' and new.status = 'rejected' then
    perform public.emit_notification(
      new.profile_id,
      v_host_id,
      'join_rejected',
      new.match_id,
      new.id
    );
  elsif old.status = 'pending' and new.status = 'cancelled' then
    perform public.emit_notification(
      v_host_id,
      new.profile_id,
      'join_request_cancelled',
      new.match_id,
      new.id
    );
  elsif old.status = 'accepted' and new.status = 'withdrawn' then
    perform public.emit_notification(
      v_host_id,
      new.profile_id,
      'participant_withdrawn',
      new.match_id,
      new.id
    );
  elsif old.status = 'accepted' and new.status = 'removed' then
    perform public.emit_notification(
      new.profile_id,
      v_host_id,
      'participant_removed',
      new.match_id,
      new.id
    );
  elsif old.status = 'cancelled' and new.status = 'pending' then
    perform public.emit_notification(
      v_host_id,
      new.profile_id,
      'join_request',
      new.match_id,
      new.id
    );
  end if;

  return new;
end;
$$;
