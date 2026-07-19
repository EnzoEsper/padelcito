-- Realtime publication for community post lifecycle (moderation queue, author detail, community feed).
-- Justified: status transitions must propagate without polling, same pattern as matches.

alter table public.community_posts replica identity full;

alter publication supabase_realtime add table public.community_posts;
