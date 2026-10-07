# Feature specification: Community event types

- **Status:** Implementing
- **Owner/date:** 2026-10-05
- **Related docs/code:**
  - [`docs/event-types.md`](../../docs/event-types.md) (validated taxonomy)
  - [`supabase/migrations/20260711010000_create_community_posts.sql`](../../supabase/migrations/20260711010000_create_community_posts.sql)
  - [`src/features/community/`](../../src/features/community/)
  - [`ai-architecture-context.md`](../../ai-architecture-context.md) §10

## 1. User problem and outcome

Community posts today only support **Tournament** and **Training**. Organizers in Argentina advertise many other formats (social americanos, leagues, clinics, exhibitions) with rich metadata: multiple divisions, scoring rules, inclusions, and fees. Players cannot filter or scan posts that match how events are actually promoted.

**Outcome:** Organizers publish posts with one of five event types, an optional subtype, up to 12 divisions, optional scoring and rules (preset + note + up to 3 rules images), grouped amenity tags, fee, and registration deadline. The feed and filters expose the new types. Posts remain moderated WhatsApp-contact announcements with **no in-app registration**.

## 2. Scope

### In scope

- Five types: `tournament`, `social`, `league`, `training`, `special_event` with type-specific subtypes.
- Child table `community_post_divisions` (0–12 rows) and RPC `set_community_post_divisions`.
- Scoring fields for tournament, league, and social only.
- Tags (up to 12), fee, registration deadline, rules images in existing `community-posts` bucket.
- Create/edit UI, feed filters, summary card, post detail, WhatsApp label copy.

### Out of scope

- In-app registration or `registeredCount`.
- Category-based feed filter (schema supports it later).
- PDF rules upload.
- Private/corporate-only events without public discovery intent beyond `special_event` corporate subtype.

## 3. User scenarios and acceptance criteria

### Scenario: Publish a multi-division tournament

Given a verified user on create-post, when they select Tournament → Groups + knockout, add two divisions (Men 6th–7th, Mixed Suma 12), set scoring and upload a rules image, then submit, then the post is `pending_review` with divisions stored via RPC.

- [ ] Invalid type/subtype pairs are rejected client and server.
- [ ] Scoring on a training post is rejected server-side.
- [ ] `other` scoring preset requires `rules_note`.

### Scenario: Browse and filter

Given approved posts of mixed types, when the user opens Community and filters by Social, then only social posts appear in Nearby/All.

- [ ] Filter bar lists all five types plus All.
- [ ] Legacy tournament/training posts render without subtype or divisions.

## 4. Constraints and existing contracts

- RLS mandatory; divisions writes only through SECURITY DEFINER RPC.
- Regenerate `src/types/database.ts` after migrations.
- Expo SDK 56, TanStack Query, padel `sport_id` on posts.

## 5. Clarifications and assumptions

### Assumptions

- Per-division fees stay in description text; card shows single fee as “From $X / unit” when set.

## 6. Non-functional requirements

- Create form may split into subcomponents if file size grows.
- Use ternary rendering for optional numeric fields in list items.

## 7. Acceptance and verification summary

- Automated: `pnpm typecheck`, `pnpm lint`, `pnpm test` (formatters + subtype map).
- Manual: create → moderate → approve → detail with rules images.
- After migrations: `npx supabase gen types typescript --local > src/types/database.ts`
