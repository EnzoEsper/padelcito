-- Generalize notification field guard: optional FK columns may be cleared to null by
-- ON DELETE SET NULL (account deletion actor unlink, participation cleanup, etc.).
-- Immutable content fields stay locked; clients may still only toggle read_at or clear
-- optional refs to null — never repoint them to a new entity.

create or replace function public.protect_notification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.recipient_id is distinct from old.recipient_id
     or new.type is distinct from old.type
     or new.data is distinct from old.data
     or new.created_at is distinct from old.created_at then
    raise exception 'Only read_at may be updated on notifications';
  end if;

  if new.actor_id is distinct from old.actor_id
     and new.actor_id is not null then
    raise exception 'Only read_at may be updated on notifications';
  end if;

  if new.match_id is distinct from old.match_id
     and new.match_id is not null then
    raise exception 'Only read_at may be updated on notifications';
  end if;

  if new.participant_id is distinct from old.participant_id
     and new.participant_id is not null then
    raise exception 'Only read_at may be updated on notifications';
  end if;

  if new.community_post_id is distinct from old.community_post_id
     and new.community_post_id is not null then
    raise exception 'Only read_at may be updated on notifications';
  end if;

  return new;
end;
$$;

comment on function public.protect_notification_fields() is
  'Clients may update read_at. Optional FK columns (actor_id, match_id, participant_id, community_post_id) may only be cleared to null — typically by ON DELETE SET NULL when linked rows are removed.';
