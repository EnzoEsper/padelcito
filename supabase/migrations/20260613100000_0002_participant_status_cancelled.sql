-- Add 'cancelled' to participant_status in an isolated migration.
-- Enum values cannot be used in the same transaction they are added.

alter type public.participant_status add value if not exists 'cancelled';
