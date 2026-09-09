-- Allow notifications.participant_id to be cleared by FK ON DELETE SET NULL when
-- match_participants rows are removed (unblock cleanup, block severance, account cascade).
-- Clients may still only toggle read_at; participant_id may not be set to a new value.

create or replace function public.protect_notification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- System unlink: participant row deleted → FK sets participant_id to null.
  if new.participant_id is distinct from old.participant_id
     and new.participant_id is null then
    if new.recipient_id is distinct from old.recipient_id
       or new.actor_id is distinct from old.actor_id
       or new.type is distinct from old.type
       or new.match_id is distinct from old.match_id
       or new.data is distinct from old.data
       or new.created_at is distinct from old.created_at
       or new.read_at is distinct from old.read_at then
      raise exception 'Only read_at may be updated on notifications';
    end if;

    return new;
  end if;

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

comment on function public.protect_notification_fields() is
  'Clients may only update read_at. participant_id may be cleared to null by FK ON DELETE SET NULL when participation rows are removed.';
