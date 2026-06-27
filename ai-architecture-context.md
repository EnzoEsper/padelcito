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
- **Spatial queries:** always through RPCs (`nearby_matches`, `nearby_listings`, `nearby_tournaments`). Never download rows and filter distance client-side. Pass `p_sport_id` from `fetchPadelSport()` for padel-scoped discovery.
- **Bracket operations:** always through RPCs (`generate_single_elimination_bracket`, `generate_round_robin`). Never construct brackets client-side.
- **Realtime:** subscribe only to the published tables (`matches`, `match_participants`, `notifications`, `tournament_matches`, `tournament_standings`, `messages`). Channel naming: `match:{id}`, `notifications:{userId}`, `tournament:{id}`, `conversation:{id}`. Always `removeChannel` on unmount. Do not poll a table that has Realtime.
- **Storage:** avatars → `avatars/{user_id}/...` (public); payment receipts → `receipts/{registration_id}/...` (private). Respect these path conventions — bucket policies depend on them.
- **Errors:** every Supabase call checks `error` explicitly; surface RLS denials as user-facing permission messages, never swallow them.

## 5. Expo / React Native Conventions

- **Managed workflow + expo-router** (file-based routing under `app/`). No ejecting; native needs go through config plugins + EAS Build.
- **Native Compilation & Deployment:** We exclusively use Expo Application Services (EAS) for native builds (`eas build`). Do not instruct the developer to use local compilation commands like `npx expo run:android` or `npx expo run:ios`. All development clients and production binaries must be built via the cloud.
- Prefer official Expo modules over community ones: `expo-location` (geo), `expo-secure-store` (tokens), `expo-image` (avatars), `expo-image-picker` (uploads), `expo-notifications` (push), `Linking.openURL` for `https://wa.me/<digits>` deep links.
- State: TanStack Query for server state (query keys mirror table names: `['matches', id]`); avoid global stores for server data. Realtime events invalidate/patch the query cache.
- Components: function components + hooks only; co-locate screen-specific components; shared UI in `src/components/`.
- Folder layout: `app/` (routes), `src/lib/` (supabase, utils), `src/features/<domain>/` (hooks + components per domain: matches, ratings, listings, tournaments), `src/types/` (generated DB types).

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
6. Do NOT introduce a custom backend/API layer; extend the database (RPCs, triggers) instead.
7. Do NOT use `npm`/`yarn`, JavaScript files in `src/`, or Spanish identifiers.
8. Do NOT store secrets in code, `app.json`, or AsyncStorage — env vars + `expo-secure-store` only.
9. Do NOT poll endpoints that have Realtime subscriptions available.
10. Do NOT write schema changes outside `supabase/migrations/`.
11. Do NOT add group WhatsApp CTAs or expose `whatsapp_phone` outside `match_contact_details()` — contact is **1:1 only** (accepted player → host; host → each accepted player from roster rows).
12. Do NOT allow roster edits, host cancel, player withdraw, or WhatsApp after `starts_at`, or any roster/contact action when `matches.status` is `cancelled` or `finished` — DB triggers/RLS enforce this; mirror with client helpers.

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
- **Reliability aggregates** (`penalty_count`, `commitment_count`, `reliability_score`) are trigger-maintained — never write them from client code.

### In-app notifications

- Table: `notifications` (Realtime-enabled). Rows inserted only by `emit_notification()` (SECURITY DEFINER) from lifecycle triggers.
- Types: `join_request`, `join_accepted`, `join_rejected`, `participant_withdrawn`, `participant_removed`, `match_cancelled`, `rating_request`.
- Client: `src/features/notifications/` (`use-notifications.ts`, `notification-display.ts`), `NotificationBell`, `app/(app)/notifications.tsx`. Mount `useNotificationsRealtime()` once in `app/(app)/_layout.tsx`.
- Penalty-eligible notifications deep-link to `app/(app)/report-penalty.tsx`; `rating_request` deep-links to `app/(app)/rate-match.tsx`.

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

`20260623140000_create_notifications`, `20260623150000_notification_triggers`, `20260623200000_match_cancellation_timestamp`, `20260623210000_reliability_reports`, `20260623220000_reliability_aggregates`, `20260624100000_post_match_ratings`, `20260624110000_schedule_match_finalizer`.

### Client mirrors (`src/features/matches/`)

- `isMatchPreStart`, `canHostEditRoster`, `canHostManageRoster`, `canHostCancelMatch`, `canPlayerWithdraw` in `use-matches.ts` — must stay aligned with DB helpers.
- `useMatchScheduleClock` in `use-match-schedule-clock.ts` — re-render at `starts_at` and end boundaries so footer/roster UI does not go stale.
- `useMatchDetail` calls `sync_match_lifecycle` before fetch; `useMatchRealtime` invalidates lists on `matches` / `match_participants` changes.
- `resolveMatchStatusBadge()` in `match-display.ts` — inline status badge on detail (Open / Full / Live / Finished / Cancelled).
- WhatsApp: accepted players get footer CTA to message **host** only; hosts get per-row WhatsApp on **accepted** roster entries only — never a group button.

## 10. Canonical References

- Schema source of truth: the full `supabase/migrations/` chain (starting with `20260608050054_0001_initial_schema.sql` and all subsequent migrations).
- Architecture rationale & roadmap: `ARCHITECTURE.md` (repo root).
- Generated DB types: `src/types/database.ts` (never hand-edit).
