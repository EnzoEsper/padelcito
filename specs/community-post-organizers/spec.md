# Feature specification: Community post organizer contacts

- **Status:** Implementing
- **Related docs/code:** [docs/decisions.md](../../docs/decisions.md), `ai-architecture-context.md` §10, migration `20261006100000_community_post_contacts.sql`

## 1. User problem and outcome

Event publishers often list multiple organizer WhatsApp numbers. Players need to reach the right person; moderators need to verify organizers before approval. Outcome: 1–3 prioritized organizer numbers per post, moderator confirmation via wa.me, public contact only after confirmation.

## 2. Scope

### In scope
- Child table `community_post_contacts` (1–3 rows, ordered, optional label).
- Author toggles own verified profile number; up to two additional numbers (free entry, AR parsing on client).
- Moderator wa.me verification template + confirm/unconfirm per number.
- Approval blocked until ≥1 confirmed contact; public UI shows confirmed contacts only.
- Type-aware player contact wa.me template.

### Out of scope
- Bird / WhatsApp Business API sends; OTP for extra numbers; in-app registration.

## 3. Acceptance criteria

- [ ] Author can publish with own number only, own + extras, or extras only (≥1 total).
- [ ] Reordering sets main organizer (position 0).
- [ ] Moderator cannot approve without a confirmed contact (DB + UI).
- [ ] Anonymous user sees only confirmed contacts on approved posts.
- [ ] Legacy posts backfilled from `contact_phone` remain contactable.

## 4. Constraints

- RLS mandatory; writes via SECURITY DEFINER RPCs.
- `contact_phone` on `community_posts` deprecated (nullable); new inserts use null.
