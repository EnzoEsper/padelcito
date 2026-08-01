# Architecture Decision Log

One paragraph per pivot: what changed, why, and which migration(s) apply. Six-months-later-you is a different developer.

---

## Match host metadata and court configs (2026-06-16 — 2026-06-19)

The initial `matches` table only supported basic pickup-game fields (venue, time, capacity, skill range). Host-facing create flows needed padel-specific setup: multiple courts with per-court format/type/structure/surface, a padel category band, gender and difficulty preferences, side preference for open spots, and optional price/age filters.

Migrations `20260616120000_add_match_host_metadata`, `20260617120000_restrict_match_gender_difficulty`, `20260618120000_add_match_court_configs`, and `20260619120000_restrict_match_position_preference` added `court_count`, `court_configs` (jsonb), `category_min`/`category_max`, required `gender_preference` (`male` | `female` | `mixed` — `open` was removed), required `difficulty` (`friendly` | `competitive`), `position_preference` (replacing short-lived `positions_sought text[]`), and optional `price_per_player`, `age_min`, `age_max`. Court capacity is validated by DB helpers against the sum of per-court slots (singles = 2, doubles = 4), not a fixed `court_count * 4` rule. Client types live in `CreateMatchInput` (`src/features/matches/use-matches.ts`) and court helpers in `src/lib/padel-court.ts`.

---

## In-app notifications (2026-06-23 — M3)

Match lifecycle events (join request, accept/reject, request cancel, withdraw, remove, match cancel, rating request) emit rows into a dedicated `notifications` table via `emit_notification()` from AFTER triggers — not from client code. Realtime keeps the bell badge live; recipients mark rows read via RLS-scoped UPDATE on `read_at` only. Migrations `20260623140000_create_notifications`, `20260623150000_notification_triggers`, and `20260627230000_join_request_cancelled_notification` (player cancels pending request → host inbox). Client: `src/features/notifications/`, `NotificationBell`, `app/(app)/notifications.tsx`.

---

## Match detail roster UX (2026-06-27)

WhatsApp deep links include editable match-context templates (`match-whatsapp.ts`). Destructive roster actions on match detail (remove player, withdraw, cancel pending request) require native confirmation dialogs; withdraw/remove copy warns inside the `late_withdrawal_threshold` window using `isWithinLateWithdrawalWindow()` in `match-display.ts`, mirroring DB penalty flags.

---

## Separate reliability vs quality ratings (2026-06-23 — M3)

Penalty behavior uses `reliability_reports` (optional wronged-party confirmation → `reliability_score` on profiles), not 1–5 star quality ratings. Quality stars stay in `ratings` with `context = 'standard'` only; legacy `rating_context` penalty values are rejected by `validate_rating`. Double-blind quality ratings: RLS restricts SELECT to the rater's own rows; only aggregates are public via `public_profiles`. Migrations `20260623200000` through `20260623220000_reliability_aggregates`.

---

## Deterministic match finishing + post-match ratings (2026-06-24 — M3)

`sync_match_lifecycle()` alone was insufficient — matches only finished when someone opened detail. Added `matches.finished_at`, `finalize_due_matches()` scheduled via pg_cron every 2 minutes, and `rating_request` notifications fan-out through `emit_rating_requests_for_match()`. Standard quality ratings allowed within 14 days of `finished_at`. Migrations `20260624100000_post_match_ratings` and `20260624110000_schedule_match_finalizer`. Client: `app/(app)/rate-match.tsx`, `src/features/ratings/use-ratings.ts`.

---

## Reliability qualified commitments (2026-06-25 — M3 hardening)

The initial reliability model incremented `commitment_count` on every host cancel/finish and every withdraw/remove, allowing score dilution (empty cancels, early withdraw spam) and pile-on (multiple `late_cancellation` reports for one cancel). Migration `20260625100000_reliability_qualified_commitments` replaces blind increments with `recompute_profile_commitments()` scanning source tables: host finish/cancel only with ≥1 accepted player; cancel commitments only when late; withdraw/remove only when penalty flags set; unique `(match_id, subject_id, type)` on reports; public `reliability_score` null until ≥3 qualified commitments. Full backfill via `recompute_all_profile_reliability()`. Client: `MIN_RELIABILITY_COMMITMENTS` in `penalty-report.ts`.

---

## Community posts rename + listings deferral (2026-07-11 — M5)

The Community tab originally shipped as moderated **flyers** (`flyers` table). Product/architecture reconciliation renamed the entity to **`community_posts`** to distinguish it from dormant **`listings`** (future response-inbox classifieds) and from future **`tournaments`** graduation. Enums: `community_post_type`, `community_post_status`, `community_post_report_reason`; reports table `community_post_reports`; RPC `nearby_community_posts`; Storage bucket **`community-posts`**; notification types `community_post_*` with FK `notifications.community_post_id`. Client code uses ergonomic **post** naming inside `src/features/community/` while all DB calls hit `community_posts`. **`listings` / `listing_responses` stay in schema but have no client UI** — deferred to M5b+. Tournament-to-post linking (`linked_tournament_id`) is deferred to M6+. Migrations rewritten in place under `202607110*`. After applying locally: `npx supabase db reset` then `npx supabase gen types typescript --local > src/types/database.ts`.

---

## Google Places proxy + shared place picker (2026-07-30)

Match and community create flows replaced hardcoded preset venues with a shared map picker (`src/features/location/`). Google **Places API (New)** runs only through Supabase Edge Function `places-search` so the REST key never ships in the app; Android map tiles use `react-native-maps` with a separate Maps SDK key. Session tokens (v4 UUID per picker session) are generated client-side and forwarded verbatim for correct session billing. Rate limiting via `consume_places_search_quota()` (migration `20260730120000_places_search_rate_limit`). Stored match/post coordinates are user-confirmed picker output; `place_id` is kept for future refresh. Full setup: `docs/places-setup.md`.
