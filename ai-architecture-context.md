# AI Architecture Context — Sports Matchmaking & Tournament Platform

> **Purpose:** This file is the immutable baseline for every AI coding session on this project.
> Read it fully before generating or modifying any code. Deviations from these rules are regressions, not improvements.
> Place this file at the repository root and reference it from `CLAUDE.md` / `.cursorrules`.

---

## 1. Project Identity

- **Product:** Padel matchmaking app (Padelcito) — find and host padel pickup matches, trust ratings, and (roadmap) open listings, tournaments & circuits. The database schema supports multiple sports; **MVP client flows manage padel only**. Always resolve the sport via `PADEL_SPORT_SLUG` (`src/lib/padel-sport.ts`); never pick the first row from the sports catalog or build generic sport pickers until multi-sport is explicitly in scope.
- **Backend:** Supabase — PostgreSQL 15+, PostGIS, Row Level Security, Realtime, Storage, Auth. There is **no custom backend server**; the database IS the backend. Business rules live in SQL (triggers, RPCs, RLS), not in client code.
- **Frontend:** React Native with **Expo** (managed workflow, expo-router), TypeScript strict.
- **Language:** ALL code, identifiers, comments, commit messages, and docs are written in **English**. No exceptions.

## 2. Package Management — pnpm ONLY

- Use `pnpm` for every install/script. **Never** use `npm` or `yarn`; never commit `package-lock.json` or `yarn.lock`.
- Expo-compatible installs: `pnpm dlx expo install <pkg>` (resolves SDK-pinned versions). Plain libraries: `pnpm add <pkg>`.
- Scripts: `pnpm start`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- `node-linker=hoisted` is set in `.npmrc` (required for React Native + pnpm). Do not remove it.

## 3. Database Conventions (NON-NEGOTIABLE)

- **Naming:** `snake_case` for all tables/columns/functions/policies; tables plural (`matches`); enums singular (`match_status`); triggers `trg_*`; indexes `idx_*`; RLS helpers `is_*` / `has_*` / `can_*`.
- **Types:** `uuid` PKs with `gen_random_uuid()`; `timestamptz` (never `timestamp`); `smallint` for small ranges; `jsonb` for volatile config (scoring rules, points config, listing details); `extensions.geography(point, 4326)` for coordinates; `text` with `CHECK` length constraints (never `varchar(n)`).
- **Every new table MUST ship in the same migration with:** `enable row level security` + explicit policies for `anon` and `authenticated`, B-tree indexes on every FK, GIST on every geography column, and correct `on delete` behavior (cascade for ownership, set null for history, restrict for catalogs).
- **Data API grants:** Supabase defaults `auto_expose_new_tables` to `false` (see `supabase/config.toml`). RLS alone is not enough — every new `public` table also needs explicit `GRANT`s to `anon` / `authenticated` (or be covered by a project-wide grants migration). Without table-level grants, PostgREST returns `42501 permission denied` before RLS runs.
- **RLS rules:** wrap auth as `(select auth.uid())`; cross-table checks go through `SECURITY DEFINER` helper functions with `set search_path = public` — never inline subqueries that can recurse.
- **Sensitive columns:** `profiles.whatsapp_phone` is readable only via the `match_contact_details()` RPC. Never add it to a view, policy, or query result for other users. Other users read profiles ONLY through the `public_profiles` view.
- **Standings are trigger-maintained:** never write to `tournament_standings` from client code.
- **Migrations:** only via `supabase migration new <name>`; never edit applied migrations; never change schema in the Dashboard; forward-fix mistakes with a new migration. Regenerate types in the same commit:
  `supabase gen types typescript --local > src/types/database.ts`.

## 4. Supabase Client Patterns

- Single client instance in `src/lib/supabase.ts`, typed with `Database` from generated types; session storage via `expo-secure-store` adapter. Only the **anon key** in the app — `service_role` never ships to a client.
- **Spatial queries:** always through RPCs (`nearby_matches`, `nearby_listings`, `nearby_tournaments`, `nearby_community_posts`). Never download rows and filter distance client-side. Pass `p_sport_id` from `fetchPadelSport()` for padel-scoped discovery. Client-side marker clustering of RPC results (e.g. `supercluster` on Discover map) is presentation-only — spatial filtering stays in Postgres.
- **Edge Function exceptions (integration proxies only):** `supabase/functions/places-search` holds the Google Places REST key; `supabase/functions/push` holds the Expo push access token and delivers alerts when `notifications` rows are inserted. Setup: `docs/places-setup.md`, `docs/push-setup.md`. Do not add other Edge Functions for business logic.
- **Bracket operations:** always through RPCs (`generate_single_elimination_bracket`, `generate_round_robin`). Never construct brackets client-side.
- **Realtime:** subscribe only to the published tables (`matches`, `match_participants`, `notifications`, `community_posts`, `tournament_matches`, `tournament_standings`, `messages`). Channel naming: `match:{id}`, `notifications:{userId}`, `post:{id}`, `moderation:posts`, `community:posts`, `my-posts:{userId}`, `tournament:{id}`, `conversation:{id}`. Always `removeChannel` on unmount. Do not poll a table that has Realtime.
- **Storage:** avatars → `avatars/{user_id}/...` (public); payment receipts → `receipts/{registration_id}/...` (private); community post covers → `community-posts/{author_id}/...` (public). Respect these path conventions — bucket policies depend on them.
- **Errors:** every Supabase call checks `error` explicitly; surface RLS denials as user-facing permission messages, never swallow them.

## 5. Expo / React Native Conventions

- **Managed workflow + expo-router** (file-based routing under `app/`). No ejecting; native needs go through config plugins + EAS Build.
- **Native Compilation & Deployment:** We exclusively use Expo Application Services (EAS) for native builds (`eas build`). Do not instruct the developer to use local compilation commands like `npx expo run:android` or `npx expo run:ios`. All development clients and production binaries must be built via the cloud.
- Prefer official Expo modules over community ones: `expo-location` (geo), `expo-secure-store` (tokens), `expo-image` (avatars), `expo-image-picker` (uploads), `expo-notifications` (push), `Linking.openURL` for `https://wa.me/<digits>` deep links.
- **Maps:** `react-native-maps` for map tiles (Android: Google Maps SDK key in manifest via `app.config.ts`; iOS: Apple Maps). Requires an EAS dev client — not Expo Go. Style maps with inline `customMapStyle` JSON only; **never** load `MapView` with a cloud Map ID (billable Dynamic Maps SKU). Discover clustering uses `supercluster` (client-side only).
- **Themed overlays:** prefer `AppAlertDialog` and `AppBottomSheet` (`src/components/`) over native `Alert.alert` for confirmations and pickers.
- State: TanStack Query for server state (query keys mirror table names: `['matches', id]`); avoid global stores for server data. Realtime events invalidate/patch the query cache. Primary feeds (Discover, Matches, Profile) support pull-to-refresh via `RefreshControl`.
- Components: function components + hooks only; co-locate screen-specific components; shared UI in `src/components/`.
- Folder layout: `app/` (routes), `src/lib/` (supabase, utils), `src/features/<domain>/` (hooks + components per domain: matches, ratings, community, listings, tournaments), `src/types/` (generated DB types).

## 6. Linting & Code Quality (STRICT)

- TypeScript `strict: true`; **no `any`** (use `unknown` + narrowing); no non-null assertions (`!`) — handle null explicitly.
- ESLint: `eslint-config-expo` + `@typescript-eslint` recommended-type-checked + `react-hooks` rules; Prettier enforced; `eslint --max-warnings 0` in CI.
- No `console.log` in committed code (use a `src/lib/logger.ts` wrapper).
- All dates handled as ISO strings / `Date` in UTC; format only at render time.
- Commits: Conventional Commits (`feat:`, `fix:`, `db:` for migrations, `chore:`).

## 7. Do-Not-Regress List

1. Do NOT disable or weaken any RLS policy to "make a query work" — fix the query or add a proper helper function.
2. Do NOT expose `whatsapp_phone` outside `match_contact_details()`.
3. Do NOT add columns to `public_profiles` without a security review of each column.
4. Do NOT bypass triggers by writing status fields directly in ways that skip the state machine (e.g., setting `matches.status = 'full'` manually).
5. Do NOT add tables to the Realtime publication casually — each one costs throughput; justify it in the migration comment.
6. Do NOT introduce custom backend/API layers beyond the existing integration-proxy Edge Functions (`places-search`, `push`); extend the database (RPCs, triggers) instead.
7. Do NOT use `npm`/`yarn`, JavaScript files in `src/`, or Spanish identifiers.
8. Do NOT store secrets in code, `app.json`, or AsyncStorage — env vars + `expo-secure-store` only.
9. Do NOT poll endpoints that have Realtime subscriptions available.
10. Do NOT write schema changes outside `supabase/migrations/`.
11. Do NOT add group WhatsApp CTAs or expose `whatsapp_phone` outside `match_contact_details()` — contact is **1:1 only** (accepted player → host; host → each accepted player from roster rows).
12. Do NOT allow roster edits, host cancel, player withdraw, or WhatsApp after `starts_at`, or any roster/contact action when `matches.status` is `cancelled` or `finished` — DB triggers/RLS enforce this; mirror with client helpers.
13. Do NOT ship `GOOGLE_PLACES_API_KEY` in the app bundle or call Places API from the Discover map — coords come from `nearby_matches` RPC rows.
14. Do NOT load `MapView` with a cloud Map ID — use inline `customMapStyle` to stay on the free Maps SDK SKU.

## 8. Match Lifecycle & Contact Rules (M2)

### `match_status` enum

`open | full | in_progress | finished | cancelled`

- **`open` / `full`:** pre-start; capacity trigger flips between them. Host may cancel (`status → cancelled`), accept/reject/remove roster, and use 1:1 WhatsApp on accepted players.
- **`in_progress`:** `starts_at` has passed and `starts_at + duration_minutes` is still in the future. No host cancel, no roster remove, no player withdraw. WhatsApp remains available until finish/cancel.
- **`finished`:** end time reached (primary: `finalize_due_matches()` via pg_cron every 2 min; fallback: `sync_match_lifecycle()` on detail open). Read-only roster; no WhatsApp; optional post-match quality ratings unlock for members (14-day window from `matches.finished_at`).
- **`cancelled`:** host sets before start. Read-only footer; no roster or WhatsApp; accepted players leave Upcoming and appear in History.

Never set `full`, `in_progress`, or `finished` from client code except host cancel (`cancelled`). Lifecycle transitions are trigger- or RPC-maintained.

### Key database helpers & RPCs

| Function | Role |
| -------- | ---- |
| `is_match_pre_start(match_id)` | `open`/`full` and `starts_at > now()` |
| `is_match_roster_editable(match_id)` | Alias of pre-start; gates accept/reject/remove/withdraw |
| `is_match_active(match_id)` | Not `cancelled` or `finished`; required for `match_contact_details()` |
| `sync_match_lifecycle(match_id)` | SECURITY DEFINER; advances `open/full → in_progress → finished` from schedule; stamps `finished_at` and emits `rating_request` notifications on finish. Callable by host, participant, or any authenticated user viewing a **public** match (discover). Call before loading match detail. |
| `finalize_due_matches()` | SECURITY DEFINER; set-based cron finalizer (pg_cron every 2 min). Not client-callable. |
| `match_contact_details(match_id)` | Only path to other users' WhatsApp; blocked when match inactive |

Migrations: `20260622120000_block_actions_on_cancelled_matches`, `20260622140000_match_start_lifecycle_locks`, `20260622150000_fix_sync_match_lifecycle_auth`, `20260623120000_rename_match_completed_to_finished`.

## 9. Trust, Notifications & Ratings (M3)

### Two separate metrics — do not conflate

| Metric | Storage | Public signal | Meaning |
| ------ | ------- | ------------- | ------- |
| **Quality** | `ratings` (`context = 'standard'`) | `rating_avg`, `rating_count` on `public_profiles` | 1–5 stars + optional tags after a **finished** match |
| **Reliability** | `reliability_reports` | `reliability_score`, `penalty_count` on `public_profiles` | Optional wronged-party confirmation of late withdrawal, host removal, or late cancellation |

- **Quality ratings are double-blind:** RLS allows each rater to read only their own `ratings` rows; aggregates are trigger-maintained on `profiles`. Never expose individual rating rows to ratees.
- **Penalty contexts in `rating_context` enum are dead:** `validate_rating` rejects non-`standard` inserts. Penalties go through `reliability_reports` + `validate_reliability_report`.
- **Reliability aggregates** (`penalty_count`, `commitment_count`, `reliability_score`) are trigger-maintained via `recompute_profile_commitments()` + `recompute_profile_reliability()` — never write them from client code.

### Qualified commitments (anti-gaming)

A **qualified commitment** counts only when another player was materially involved or a late penalty flag fired. `recompute_profile_commitments()` scans source tables (not blind increments):

| Event | Who | Counts? |
| ----- | --- | ------- |
| Match → `finished` | Host | Only if ≥1 `accepted` participant |
| Match → `finished` | Each `accepted` participant | Yes |
| Match → `cancelled` | Host or `accepted` participant | Only if ≥1 `accepted` **and** late cancel (`cancelled_at >= starts_at - late_withdrawal_threshold`) |
| `accepted` → `withdrawn` | Player | Only if `was_late_withdrawal` |
| `accepted` → `removed` | Player | Only if `was_removed_by_host` |

Empty host cancels, solo auto-`finished`, and early withdraw/remove do **not** increment commitments (prevents score dilution).

**Penalties:** at most one `reliability_reports` row per `(match_id, subject_id, type)` — multiple reporters cannot pile-on one late cancel.

**Public score:** `reliability_score` is `null` ("New") until `commitment_count >= 3`; `penalty_count` remains visible to the owner on their profile.

**Deferred — rolling 90-day window:** future migration will filter commitments/penalties by recency in `recompute_profile_commitments()` (timestamps already stored on source rows); optional weekly `pg_cron` full recompute. Lifetime qualified model ships first in `20260625100000_reliability_qualified_commitments`.

### In-app notifications

- Table: `notifications` (Realtime-enabled). Rows inserted only by `emit_notification()` (SECURITY DEFINER) from lifecycle triggers.
- Types: `join_request`, `join_accepted`, `join_rejected`, `join_request_cancelled`, `participant_withdrawn`, `participant_removed`, `match_cancelled`, `rating_request`, `community_post_submitted`, `community_post_approved`, `community_post_rejected`.
- Client: `src/features/notifications/` (`use-notifications.ts`, `notification-display.ts`), `NotificationBell`, `app/(app)/notifications.tsx`. Mount `useNotificationsRealtime()` once in `app/(app)/_layout.tsx`.
- Penalty-eligible notifications deep-link to `app/(app)/report-penalty.tsx`; `rating_request` deep-links to `app/(app)/rate-match.tsx`.

### Push notifications (remote)

- Table: `push_tokens` — clients upsert Expo push tokens after permission grant; Edge Function reads enabled rows via `service_role`.
- Delivery: AFTER INSERT trigger on `notifications` → pg_net POST → Edge Function `push` → Expo Push Service (`exp.host`). Copy and deep-link routes mirror `notification-display.ts`.
- Client: `use-push-registration.ts` — register token, handle tap/cold-start navigation, invalidate notification queries on foreground delivery. Mount in `app/(app)/_layout.tsx` alongside Realtime.
- Requires EAS dev/production build (`expo-notifications` config plugin); not available in Expo Go on Android (SDK 56+). Setup: `docs/push-setup.md`.
- Migrations: `20260823120000_create_push_tokens`, `20260823130000_push_on_notification_trigger`, `20260828210000_grant_push_tokens_service_role`.

### Post-match quality ratings

- Eligibility: match `status = 'finished'`, caller is host or `accepted` participant, ≥2 members, within 14 days of `finished_at`.
- `emit_rating_requests_for_match()` fans out `rating_request` notifications when a match finishes (cron or lazy sync).
- `get_pending_rating_matches()` RPC drives History "Rate" hints without exposing others' rating rows.
- Client: `src/features/ratings/use-ratings.ts`, `rating-display.ts`, `app/(app)/rate-match.tsx`. Batch insert into `ratings`; unique `(match_id, rater_id, ratee_id)`.

### Reliability reports

- Table: `reliability_reports` with `reliability_event_type`: `late_withdrawal`, `host_removal`, `late_cancellation`.
- Late cancellation detected via `matches.cancelled_at` (stamped on cancel) vs `late_withdrawal_threshold`.
- Client: `src/features/ratings/use-reliability.ts`, `penalty-report.ts`, `app/(app)/report-penalty.tsx`, `ReliabilityBadge`.

### M3 migrations

`20260623140000_create_notifications`, `20260623150000_notification_triggers`, `20260623200000_match_cancellation_timestamp`, `20260623210000_reliability_reports`, `20260623220000_reliability_aggregates`, `20260624100000_post_match_ratings`, `20260624110000_schedule_match_finalizer`, `20260627230000_join_request_cancelled_notification`, `20260625100000_reliability_qualified_commitments`. Community post notification types added in `20260711040000_community_post_notifications` and `20260711060000_community_post_submitted_moderator_notifications`.

### Client mirrors (`src/features/matches/`)

- `isMatchPreStart`, `canHostEditRoster`, `canHostManageRoster`, `canHostCancelMatch`, `canPlayerWithdraw` in `use-matches.ts` — must stay aligned with DB helpers.
- `useMatchScheduleClock` in `use-match-schedule-clock.ts` — re-render at `starts_at` and end boundaries so footer/roster UI does not go stale.
- `useMatchDetail` calls `sync_match_lifecycle` before fetch; `useMatchRealtime` invalidates lists on `matches` / `match_participants` changes.
- `resolveMatchStatusBadge()` in `match-display.ts` — inline status badge on detail (Open / Full / Live / Finished / Cancelled).
- `isWithinLateWithdrawalWindow()` in `match-display.ts` — client mirror of DB late-withdrawal penalty window for confirm-dialog copy.
- WhatsApp: accepted players get footer CTA to message **host** only; hosts get per-row WhatsApp on **accepted** roster entries only — never a group button. Links open with pre-filled match-context text via `match-whatsapp.ts`.
- Match detail destructive actions (remove player, withdraw, cancel pending request) require confirmation via `AppAlertDialog` before mutating roster state.

## 10. Community Posts (M5 — shipped)

### Domain model

- **Table:** `community_posts` (not `listings`, not generic `posts`). Types: `community_post_type` (`tournament` | `training`); statuses: `pending_review` | `approved` | `rejected` | `archived`.
- **Reports:** `community_post_reports` with `community_post_report_reason` enum.
- **Discovery RPC:** `nearby_community_posts(p_lat, p_lng, p_radius_m, p_sport_id, p_type?)` — always pass padel `p_sport_id` from `fetchPadelSport()`.
- **Listings schema is dormant:** `listings` / `listing_responses` remain for a future response-inbox classifieds flow; do not wire Community UI to listings.

### Contact & moderation

- Approved posts expose the author's profile WhatsApp via a public `contact_phone` column on the post row (set at publish time from profile). Client builds `wa.me` links in `src/features/community/post-whatsapp.ts` — same pattern as matches but **no RPC gate** (public approved content).
- Every new post starts `pending_review`. Moderators (`profiles.role` = `moderator` | `admin`) approve/reject via RLS-scoped UPDATE; authors can archive approved posts.
- **`profiles.role`** and **`profiles.banned_at`** gate publish; helper RPCs `is_moderator()`, `is_admin()`, `is_banned()` are SECURITY DEFINER — granted to `authenticated`.

### Notifications

Types: `community_post_submitted` (moderators), `community_post_approved`, `community_post_rejected` (author). FK: `notifications.community_post_id`. JSON payload key for title: `post_title`.

### Realtime & client module

- Table published to Realtime in migration `20260711070000_community_posts_realtime.sql`.
- Client: `src/features/community/` — ergonomic **post** naming (`usePostDetail`, `postKeys`, `PostSummaryCard`) while DB calls use `community_posts`.
- Routes: `app/(app)/community.tsx`, `create-post`, `post-detail`, `my-posts`, `moderation`.
- Hooks: `use-posts.ts`, `use-post-realtime.ts`; mount `useModerationPostsRealtime` in `app/(app)/_layout.tsx` for moderator badge.
- Storage: `src/lib/post-storage.ts` → bucket **`community-posts`** (hyphenated).
- **Cover upload:** optional free-form crop via `post-flyer-crop-screen.tsx` / `post-flyer-pick-editor.tsx` (`post-flyer-crop-math.ts`).
- **Filters:** unified chip row + bottom sheets in `community-filter-bar.tsx` (aligned with Discover layout).
- **Location on create:** shared `LocationField` from `src/features/location/` (same Places picker as matches).

### M5 migrations

`20260711000000_add_user_role`, `20260711010000_create_community_posts`, `20260711020000_create_community_post_reports`, `20260711030000_create_community_posts_bucket`, `20260711040000_community_post_notifications`, `20260711050000_grant_role_helper_functions`, `20260711060000_community_post_submitted_moderator_notifications`, `20260711070000_community_posts_realtime`.

## 11. Canonical References

- Schema source of truth: the full `supabase/migrations/` chain (starting with `20260608050054_0001_initial_schema.sql` and all subsequent migrations).
- Architecture rationale & roadmap: `ARCHITECTURE.md` (repo root).
- Generated DB types: `src/types/database.ts` (never hand-edit).
- Google Maps / Places setup: `docs/places-setup.md`.
- Push notifications setup: `docs/push-setup.md`.
- M2 / M4 handoff checklists: `docs/m2-control-checklist.md`, `docs/m4-control-checklist.md`.
- Architecture decision log: `docs/decisions.md`.

## 12. Location, Maps & Places (shipped)

The database remains the source of truth for match/post coordinates. Google integration is split across two keys and one Edge Function:

| Key / surface | Where it lives | Purpose |
| --- | --- | --- |
| **Maps SDK key** | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (app env + EAS) | Android map tiles via `react-native-maps` (iOS uses Apple Maps — no Google key) |
| **Places REST key** | Supabase secret `GOOGLE_PLACES_API_KEY` only | Autocomplete + Place Details via Edge Function — **never** in the app bundle |

### Edge Function: `places-search`

- Path: `supabase/functions/places-search/index.ts`.
- Proxies Google **Places API (New)** only; requires authenticated JWT.
- Session tokens: client generates a v4 UUID per picker session and forwards it verbatim (autocomplete + details = one billed session).
- Rate limit: `consume_places_search_quota()` — migration `20260730120000_places_search_rate_limit` (default 20 req / 60 s / user).

### Shared client module: `src/features/location/`

- `LocationField`, `PlacePicker`, `PlaceMapView`, `places-client.ts`, `use-place-search.ts`.
- Used by create-match and create-post flows.
- Fallbacks: map pin + on-device reverse geocode when Places proxy is down; recent venues in SecureStore.

### Stored location fields

On `matches` and `community_posts`: `location` (geography), `venue_name`, `formatted_address`, `place_id` (migration `20260627210000_match_formatted_address` for matches). Coordinates written as WKT `POINT(lng lat)` via `coordsToWkt()`. User-confirmed picker output is authoritative; `place_id` is kept for future refresh.

### Billing guardrails

- Maps SDK SKU is unlimited/no-cost when **not** using a cloud Map ID.
- Inline dark `customMapStyle` in `PlaceMapView` and Discover map — do not migrate to cloud-based map styling.
- Full setup, troubleshooting, and EAS env: `docs/places-setup.md`.

## 13. Discover Spatial UI (M4 — shipped)

Interactive map on the Discover tab for nearby open matches. **No Places API calls** — reads coords already returned by `nearby_matches`.

### Data flow

1. `useDiscoverLocation()` → user coords + reverse-geocoded label (persisted to profile).
2. `queryCenter` state in `app/(app)/discover.tsx` — defaults to user coords; updated by "Search this area" after panning.
3. `useDiscoverMatches(queryCenter, radiusKm)` → RPC `nearby_matches` → hydrates `MatchSummary` with `distanceM` and `coords` (from RPC `lat`/`lng`, fallback `parseGeographyPoint(match.location)`).
4. `useDiscoverMatchesRealtime()` invalidates discover queries on match/participant changes.

### Map UI (`src/features/discover/`)

- `discover-map.tsx` — contained rounded map card, `supercluster` clustering, recenter, search-this-area pill, synced bottom carousel.
- `map-match-marker.tsx`, `map-cluster-marker.tsx`, `map-match-card.tsx`, `discover-map-utils.ts`.
- List/map toggle; map body is **not** inside a vertical `ScrollView` (gesture conflict).
- Category filter and radius slider apply to both list and map modes.

### UX contracts

- Tap marker → select match, center map, scroll carousel; swipe carousel → sync marker selection; tap card → `match-detail`.
- Tap cluster → zoom to expansion level.
- Recenter → reset `queryCenter` to user coords and animate map.
- Matches without coords are omitted from the map (still visible in list if returned by RPC).

### Verification handoff

See `docs/m4-control-checklist.md`.
