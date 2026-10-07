# Feature specification: Create post flow v2

- **Status:** Implementing
- **Owner/date:** 2026-10-07
- **Related docs/code:**
  - [`docs/event-types.md`](../../docs/event-types.md)
  - [`app/(app)/create-post/`](../../app/(app)/create-post/)
  - [`src/features/community/create-post/`](../../src/features/community/create-post/)
  - Supersedes [`specs/community-create-post-ux/spec.md`](../community-create-post-ux/spec.md)

## 1. User problem and outcome

Organizers need to publish community events quickly without losing the ability to add divisions, fees, and rules. The previous single-screen form separated related fields (type vs details), used a large flyer block, and lacked a preview before moderation submit.

**Outcome:** A 3-step native stack (Type & format → Details → Review) with type-driven required fields, compact flyer UX, grouped sections, inline validation, and a preview that matches feed and detail views. Event formats are revised for Argentina-friendly labels (Traditional, Sum, Other with note).

## 2. Scope

### In scope

- Native stack routes: `create-post/index`, `details`, `review` with shared form provider.
- Revised tournament formats: `traditional`, `suma`, `teams`, `americano`, `other`; `other` on every type with `subtype_note`.
- Server validation: subtype required, note for Other, `event_start` except training; divisions required for tournament/league; sum format division checks.
- Preview using shared `PostDetailContent` and feed card.

### Out of scope

- Spanish localization (English UI only for now).
- In-app registration.

## 3. User scenarios and acceptance criteria

### Scenario: Fast tournament publish

Given a verified user, when they pick Tournament → Traditional, fill title, location, date, one category, and organizer contact, then review and submit, then the post is `pending_review` with divisions stored.

- [ ] Step 1 blocks Continue until format (and Other note) is set.
- [ ] Tournament without categories fails validation on Review with inline error.
- [ ] Review shows feed and detail previews.

### Scenario: Training without date

Given Training type, when the user chooses no date, then submit succeeds if other required fields are valid.

- [ ] Only training allows missing `event_start`.

## 4. Constraints and existing contracts

- RLS mandatory; divisions via `set_community_post_divisions`.
- Regenerate `src/types/database.ts` after migrations.
- Expo SDK 56, TanStack Query.

## 5. Clarifications and assumptions

### Assumptions

- Legacy `elimination` / `round_robin` rows remapped to `other` with note text.

## 6. Non-functional requirements

- Discard confirmation when leaving details/review with dirty state.

## 7. Acceptance and verification summary

- `pnpm typecheck`, `pnpm lint`, `pnpm test`
- Manual: each type E2E, Android back, moderation approve
