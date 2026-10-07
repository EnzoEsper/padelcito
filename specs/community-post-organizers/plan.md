# Plan: Community post organizer contacts

See attached product plan in Cursor (`post_organizer_contacts`). Implementation follows divisions RPC pattern with stricter public RLS (confirmed + approved only).

## Database

Single migration: table, `can_manage_community_post`, RLS, `set_community_post_contacts`, `set_community_post_contact_confirmed`, approval gate trigger, `enforce_community_post_limits` update, backfill, `contact_phone` nullable.

## Client

- `post-whatsapp.ts` templates + tests
- `use-posts.ts` hydrate contacts, sync RPC, confirm mutation
- `post-contact-fields.tsx` + form state
- `post-detail.tsx` + moderation approve gate; card badge

## Verify

`pnpm typecheck`, `pnpm lint`, `pnpm test`; manual device pass documented in `tasks.md`.
