# Plan: Community event types

## Approach

1. Three Supabase migrations (enum values in migration 1; columns + trigger in 2; divisions + RPC in 3).
2. Centralize labels and formatters in `post-display.ts` with unit tests.
3. Extend create-post form and `use-posts` mutation sequence: insert post → upload rules images → update paths → `set_community_post_divisions`.
4. Update feed UI and `ai-architecture-context.md` / `docs/decisions.md`.

## Files (expected)

| Area | Files |
| --- | --- |
| DB | `supabase/migrations/20261005230000_community_event_types_enum.sql`, `20261005240000_community_event_attributes.sql`, `20261005250000_community_post_divisions.sql` |
| Client | `post-display.ts`, `use-create-post-form.ts`, `create-post-form.tsx`, new `create-post/components/*`, `use-posts.ts`, `community-filter-bar.tsx`, `post-summary-card.tsx`, `post-detail.tsx`, `post-whatsapp.ts`, `community.tsx` |
| Tests | `src/features/community/post-display.test.ts` |
| Docs | `docs/event-types.md`, `ai-architecture-context.md`, `docs/decisions.md` |

## Risks

- Enum ADD VALUE requires separate migration from column usage — split as planned.
- Large create form — extract division/scoring/tag sections if needed.
