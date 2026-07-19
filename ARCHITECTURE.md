# Sports Matchmaking & Tournament Platform — Architecture Master Document

> **Stack:** PostgreSQL 15+ on Supabase (PostGIS · Realtime · RLS · Storage · Auth) + React Native (Expo) + pnpm
> **Approach:** Greenfield, solo architect/developer, English-only codebase
> **Date:** 2026-06-05

## Deliverable Map

| File                                                         | Purpose                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [`schema.sql`](./schema.sql)                                 | Complete production DDL — apply as the initial Supabase migration            |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)                       | This document: schema rationale, development plan, solo-dev workflow         |
| [`ai-architecture-context.md`](./ai-architecture-context.md) | Drop into the future repo root — baseline context for all AI coding sessions |

---

# 1. Schema Architecture Overview

## 1.1 Entity-Relationship Narrative

```
auth.users ──1:1── profiles ──N:M── sports (via profile_sports)
                      │
        ┌─────────────┼──────────────────────────┬───────────────┐
        │             │                          │               │
     matches      listings                   circuits        conversations
        │             │                          │               │
 match_participants  listing_responses      tournaments     conversation_members
        │                                        │               │
     ratings                          ┌──────────┼──────────┐  messages
  reliability_reports                 │          │          │
  notifications                       │          │          │
 community_posts                      │          │          │
                                      │          │          │
                          tournament_courts  registrations  stages
                                      │          │          │
                                      └── tournament_matches ┘
                                                 │
                                       tournament_standings
                                       circuit_standings
```

**22 tables across 7 domains** (includes `notifications`, `reliability_reports`, and `community_posts` added after MVP core):

| Domain                 | Tables                                                                                                                                                             | Roadmap phase                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Identity & catalog     | `sports`, `profiles`, `profile_sports`                                                                                                                             | MVP                                |
| Core matchmaking       | `matches`, `match_participants`                                                                                                                                    | MVP                                |
| Trust & penalties      | `ratings`, `reliability_reports`, `notifications`                                                                                                                  | Phase 2 (M3 — shipped)             |
| Community posts        | `community_posts`, `community_post_reports`                                                                                                                        | Phase 3 (M5 Community — shipped)   |
| Open listings (dormant)| `listings`, `listing_responses`                                                                                                                                    | Deferred — response-inbox classifieds |
| Tournaments & circuits | `circuits`, `tournaments`, `tournament_courts`, `tournament_registrations`, `tournament_stages`, `tournament_matches`, `tournament_standings`, `circuit_standings` | Phases 4–5                         |
| Chat (dormant)         | `conversations`, `conversation_members`, `messages`                                                                                                                | Future — zero-migration activation |

## 1.2 Key Design Decisions & Rationale

### Multi-sport from day one

`sports` is a seeded reference catalog. Every match, listing, tournament, and circuit references a `sport_id`. Per-sport defaults (team size, scoring rules) live in `default_scoring_config jsonb`, so adding a sport is an `INSERT`, never a migration.

**Current release scope (Padelcito MVP):** the app manages **padel matches only**. Client code resolves the padel sport via slug (`padel`) through `src/lib/padel-sport.ts`. Non-padel sports are seeded in the catalog but marked `is_active = false` (see migration `deactivate_non_padel_sports`); re-enabling a sport requires setting `is_active = true` and building explicit multi-sport client flows.

### WhatsApp contact reveal without leaking phone numbers

`profiles.whatsapp_phone` (E.164, CHECK-validated) is **unreachable through RLS for other users** — the `profiles` SELECT policy only allows your own row. Everyone else reads public fields through the `public_profiles` view (a column-projection security boundary). The **only** path to another user's phone is the `match_contact_details(match_id)` SECURITY DEFINER RPC, which:

1. Requires authentication.
2. Verifies the caller is the host or an _accepted_ participant of that specific match.
3. Returns ready-to-use `https://wa.me/<digits>` deep links.

Acceptance of a join request is therefore the exact moment contact data becomes reachable — matching the product flow precisely.

**1:1 contact only (no group chat):** the client never renders a group WhatsApp button. Accepted players message the host via a footer CTA; the host messages each accepted player individually from roster rows. Both paths call `match_contact_details()` then `Linking.openURL` on a `wa.me` link with a pre-filled match-context message (`src/features/matches/match-whatsapp.ts`). Contact is blocked when `is_match_active()` is false (`cancelled` or `finished`).

### Match lifecycle — schedule-driven status machine

`matches.status` uses enum `match_status`: `open | full | in_progress | finished | cancelled`.

| Status | Meaning |
| ------ | ------- |
| `open` / `full` | Pre-start; capacity trigger toggles between them when roster fills or spots reopen. |
| `in_progress` | `starts_at ≤ now() < starts_at + duration_minutes`. |
| `finished` | End time reached; set automatically by `sync_match_lifecycle()`. |
| `cancelled` | Host cancellation before start (`UPDATE status = 'cancelled'` — never hard-delete). |

**`sync_match_lifecycle(match_id)`** (SECURITY DEFINER) compares `now()` to `starts_at` and `starts_at + duration_minutes`, promoting `open/full → in_progress → finished` and stamping `finished_at`. On finish it emits `rating_request` notifications. Authorized callers: match host, any participant with a relationship row, or any authenticated user when `matches.is_public`. The match-detail hook calls this RPC before fetch.

**`finalize_due_matches()`** (SECURITY DEFINER, pg_cron every 2 min) set-based finalizer — guarantees matches reach `finished` even if nobody opens detail. Not client-callable.

**Pre-start locks** (`is_match_pre_start`, `is_match_roster_editable`): until `starts_at`, the host may cancel, accept/reject/remove participants, and players may withdraw. After start, triggers and RLS block cancel, roster removal, and withdrawal. **`cancelled` and `finished`** block all participant mutations and WhatsApp reveal.

Client helpers in `src/features/matches/use-matches.ts` mirror these rules; `useMatchScheduleClock` forces re-render at schedule boundaries.

### Trust — quality vs reliability (two metrics)

**Quality (stars):** `ratings` table with `context = 'standard'`. Mutual optional 1–5 star ratings after a match is **`finished`**, within 14 days of `finished_at`. Double-blind RLS (rater reads own rows only); `rating_avg` / `rating_count` denormalized on `profiles` by trigger.

**Reliability (penalties):** `reliability_reports` table — optional wronged-party confirmations for `late_withdrawal`, `host_removal`, and `late_cancellation`. Separate from stars. `reliability_score`, `penalty_count`, and `commitment_count` on `profiles` are recomputed from source events (qualified commitment rules — see `ai-architecture-context.md` §9). Public `reliability_score` requires ≥3 qualified commitments; one penalty strike max per `(match, subject, event type)`.

The participant state machine sets eligibility flags (`was_late_withdrawal`, `was_removed_by_host`); late cancellation uses `matches.cancelled_at` vs `late_withdrawal_threshold`. In-app notifications deep-link to optional report/rating screens — nothing is applied automatically.

Legacy `rating_context` penalty values (`late_withdrawal`, `host_removal`) remain in the enum but `validate_rating` rejects them; use `reliability_reports` instead.

**Deferred — rolling reliability window:** a future migration will limit commitments and penalties to a rolling window (e.g. 90 days) inside `recompute_profile_commitments()` / penalty counts, with optional periodic `pg_cron` recompute. Not shipped in M3 hardening (`20260625100000_reliability_qualified_commitments`).

### Non-expiring listings by construction (deferred)

`listings` deliberately has **no expiry column**. Status (`open / closed / archived`) is only mutable by the creator (RLS-enforced). `details jsonb` absorbs type-specific payloads (coaching package pricing, training schedule) without schema churn.

**Current release:** the schema remains in place but **no client UI** ships for listings. The Community tab uses **`community_posts`** — moderated tournament/training publications with cover images, spatial discovery via `nearby_community_posts`, and WhatsApp contact on approved posts. Listings stay reserved for a future response-inbox classifieds flow (M5+ deferred).

### One tournament engine for official events AND on-the-fly play

A single `tournaments` table serves both worlds, switched by `is_local`:

- **Official:** registration windows, capacity, entry fee, manual payment-proof review (`payment_status` lifecycle + `receipt_storage_path` into a private Storage bucket readable only by registrant + organizer), seeding, circuit linkage.
- **Local ("on-the-fly"):** `is_local = true` relaxes score reporting — any approved participant may update live scores (`can_report_score()` helper); `source_match_id` lets a matchmaking group spawn a mini-tournament in one tap; `scoring_config jsonb` carries fully custom rules (sets, games, tie-breaks).

`tournament_stages` enables chained formats (group stage → knockout). Bracket mechanics are server-side SQL:

- `generate_single_elimination_bracket()` — next-power-of-two sizing, classic seeding (seed _j_ vs seed _size−j+1_), automatic byes resolved as walkovers.
- `generate_round_robin()` — circle-method scheduling with bye handling for odd counts.
- `handle_bracket_advance` trigger — winners flow into `next_match_id/next_match_slot` automatically.
- `recompute_stage_standings()` — full leaderboard recomputation (wins, sets, games, points, rank) on every finished tournament match. Standings are **client-read-only**; only the SECURITY DEFINER trigger writes them.

### Geospatial discovery

All location columns are `geography(Point, 4326)` with GIST indexes. Discovery RPCs (`nearby_matches`, `nearby_listings`, `nearby_tournaments`) take `(lat, lng, radius_m)` — the radius is **dynamically configurable per call** (and `profiles.search_radius_m` stores each user's preferred default). They are SECURITY INVOKER, so RLS still filters rows; `ST_DWithin` on geography uses the spatial index and returns meters. For the padel MVP, always pass `p_sport_id` from the padel sport lookup.

### Realtime replication — explicit table list

| Table                  | Why it streams                                                                |
| ---------------------- | ----------------------------------------------------------------------------- |
| `matches`              | capacity flips `open ↔ full`; lifecycle sync flips `in_progress` / `finished`; cancel updates lists |
| `match_participants`   | join-request lifecycle: requester sees accept/reject the moment the host taps |
| `notifications`        | in-app inbox badge + list update live for the recipient                       |
| `tournament_matches`   | **live scores** + court assignments to every spectator device                 |
| `tournament_standings` | leaderboard refresh the instant a result lands                                |
| `messages`             | future chat, already wired                                                    |

All six use `REPLICA IDENTITY FULL` so UPDATE events carry previous state (needed for client-side diffing). Everything else is request/response — keeping the publication minimal protects Realtime throughput.

### RLS architecture

- **Every table** has RLS enabled and explicit policies; `tournament_standings` intentionally has _no_ write policies (trigger-only writes).
- **Data API grants:** With Supabase `auto_expose_new_tables = false` (default since 2026-05-30), tables also need explicit `GRANT`s to `anon` / `authenticated`. RLS filters rows; grants control whether PostgREST can access the table at all. See migration `grant_data_api_access`.
- All cross-table checks route through `SECURITY DEFINER` helper functions (`is_match_host`, `is_match_member`, `is_tournament_organizer`, `is_stage_visible`, `can_report_score`, …) — this breaks mutual-recursion between policies and keeps each policy a one-liner.
- `auth.uid()` is always wrapped as `(select auth.uid())` so the planner evaluates it once per statement (InitPlan), not per row.
- **anon:** read-only on public surfaces (sports catalog, public matches, open listings, published tournaments, brackets, standings — live scores are watchable without an account). Zero writes.
- **authenticated:** public reads + own/member rows; all writes ownership-checked.
- **Field-level guards** that RLS cannot express (registrants must not self-approve or self-seed) are enforced by the `protect_registration_fields` trigger.

### Referential integrity policy

- `ON DELETE CASCADE`: ownership chains (user → profile → participations/ratings/listings; tournament → stages → matches → standings).
- `ON DELETE SET NULL`: historical references that must survive (court of a played match, source match of a tournament, sender of an old message).
- `ON DELETE RESTRICT`: `sports` — a sport with live data cannot be dropped accidentally.

---

# 2. Step-by-Step Progressive Development Plan

Ordered strictly by **data dependency** so nothing is ever built on sand. Each milestone is shippable; defer anything not listed in its scope.

### M0 — Foundation (≈ 2–3 days)

- Install Supabase CLI + Docker; `supabase init`, `supabase start`.
- Create the hosted Supabase project (production).
- Repo scaffold: `pnpm create expo-app`, TypeScript strict, expo-router, ESLint/Prettier.
- Apply `schema.sql` as migration `0001_initial_schema`; run `supabase gen types typescript` into `src/types/database.ts`.
- CI skeleton (GitHub Actions): lint + typecheck + `supabase db reset` smoke test.
- **Exit criteria:** local stack runs the full schema; Expo app boots and connects.

### M1 — Auth & Identity (≈ 1 week)

- Email/OTP + social sign-in via `supabase-js`; session persistence with `expo-secure-store`.
- Profile screen: username, display name, bio, WhatsApp phone (E.164 input mask), home location picker (`expo-location`), avatar upload to the `avatars` bucket.
- Sport skill selection (`profile_sports`).
- **Exit criteria:** signup → trigger-created profile → edit → avatar render via `public_profiles`.

### M2 — Core Matchmaking MVP (≈ 2 weeks) ← first real release

- Create match (sport, venue, map pin, datetime, capacity, duration, skill range, court count + per-court configs, category band, gender/difficulty/position preferences, optional price and age filters).
- Match feed (list, no map yet) + detail screen; request to join with message.
- Host inbox: accept / reject (watch the capacity trigger flip `open → full`).
- On acceptance: call `match_contact_details()` and render **1:1** `wa.me` deep links (`Linking.openURL`) — player→host in footer; host→each accepted player on roster rows.
- Withdraw / remove flows (pre-start only); host cancel match (`status = 'cancelled'`) pre-start; schedule-driven `in_progress` / `finished` via `sync_match_lifecycle`.
- **Exit criteria:** two phones complete the full host→request→accept→WhatsApp loop; cancel and post-start lock behavior verified.

### M3 — Trust & Penalties (≈ 1 week) ✅ shipped

- In-app notifications for match lifecycle events (`notifications` table + Realtime + bell icon).
- Separate reliability reports (`reliability_reports`) for late withdrawal, host removal, and late cancellation — distinct from quality stars.
- Post-match mutual quality rating sheet (`rate-match` route) once **`finished`**, with pg_cron finalizer + 14-day window.
- Rating/reliability display on profile and match cards (`rating_avg`, `reliability_score`).
- **Exit criteria met:** penalty reports optional and validated in DB; quality ratings double-blind; aggregates trigger-maintained.

### M4 — Spatial Discovery & Realtime (≈ 1 week)

- Map view + radius slider calling `nearby_matches` (persist preference to `search_radius_m`).
- Realtime subscriptions for match lifecycle and notifications are **already wired** (`useMatchRealtime`, `useNotificationsRealtime`). Remaining M4 work: map UI and any polling cleanup outside those paths.
- **Exit criteria:** acceptance appears on the requester's device within ~1s, app backgrounded-then-resumed included.

### M5 — Community Posts (≈ 1 week) ✅ shipped

- Moderated tournament/training **publications** on the Community tab (`community_posts`, `community_post_reports`).
- Create flow with cover image upload (`community-posts` Storage bucket), profile WhatsApp gate, and `pending_review → approved/rejected` moderation.
- Spatial discovery via `nearby_community_posts`; global "All events" feed; author "My publications"; moderator queue with report counts.
- Realtime on `community_posts` for discovery feed, detail status, moderation badge, and author list (`use-post-realtime.ts`).
- In-app notifications: `community_post_submitted` (moderators), `community_post_approved` / `community_post_rejected` (authors).
- **Exit criteria met:** author submits → moderator notified → approve → author sees live status; approved post reachable via WhatsApp CTA.

### M5b — Open Listings (deferred)

- Original plan: create/browse listings (training partner, team search, coaching offer) with `nearby_listings` and a response inbox.
- **Deferred:** schema (`listings`, `listing_responses`) stays dormant; Community Posts cover the padel discovery need for tournaments/training. Revisit when classifieds/response-inbox UX is prioritized.
- **Exit criteria (when built):** a coach publishes a package; a user responds; creator accepts.

### M6 — Official Tournaments (≈ 2–3 weeks)

- Organizer wizard: tournament CRUD, courts, registration window, entry fee.
- Player registration + receipt upload to `receipts` bucket; organizer review queue (`verified` / `rejected`).
- Approve registrations → `generate_single_elimination_bracket()` / `generate_round_robin()`.
- Bracket view, court assignment, score entry (organizer), automatic standings.
- **Exit criteria:** an 8-player tournament runs end-to-end: register → pay → verify → draw → play → champion.

### M7 — Local On-the-Fly Tournaments (≈ 1–2 weeks)

- "Quick tournament" flow: pick players (optionally seeded from a match via `source_match_id`), court count, custom `scoring_config`, instant bracket.
- Participant score reporting (`can_report_score`) + live spectator bracket via Realtime on `tournament_matches`.
- **Exit criteria:** four friends create and complete a mini-bracket with live score sync on all devices.

### M8 — Circuits & Hardening (≈ 1–2 weeks)

- Circuits CRUD; circuit standings fed from tournament results using `points_config`.
- Hardening pass: RLS audit (attempt every forbidden operation as anon + stranger), `EXPLAIN ANALYZE` on feed/spatial queries, index review, backup/PITR verification, load test live-score fan-out.
- **Exit criteria:** a 3-tournament circuit produces a correct aggregated ranking; audit checklist green.

> **Velocity rule for a solo dev:** never work ahead of the current milestone's exit criteria. The schema already anticipates the future — the app code should not.

---

# 3. Solo-Dev Workflow & Environment Strategy

## 3.1 Git Topology — trunk-based, minimal ceremony

```
main  ──────●──────●──────●──────●──▶   always deployable, tagged per milestone (v0.2.0-m2)
              \feat/m2-join-requests
               \fix/capacity-race
```

- Short-lived `feat/*`, `fix/*` branches (hours–days, never weeks); squash-merge to `main`.
- No `develop` branch — pointless overhead for one developer. CI on `main` is the gate.
- Conventional commits (`feat:`, `fix:`, `db:` for migrations) → changelog for free.

## 3.2 Environment Topology

| Environment    | What                                                                  | Source of truth                |
| -------------- | --------------------------------------------------------------------- | ------------------------------ |
| **Local**      | `supabase start` (Docker) — full Postgres + Auth + Realtime + Storage | `supabase/migrations/*`        |
| **Production** | Hosted Supabase project                                               | same migrations, applied by CI |
| _(Staging)_    | Add a second hosted project **only when** real users exist (≥ M6)     | same migrations                |

**Iron rules:**

1. **Never edit schema in the Dashboard.** Every change is a file: `supabase migration new <name>` → write SQL → `supabase db reset` locally → commit. If you slip, recover with `supabase db diff --linked`.
2. Regenerate types in the same commit as the migration: `supabase gen types typescript --local > src/types/database.ts`. The diff in types is your migration review.
3. Seeds live in `supabase/seed.sql` (sports catalog + dev fixtures) so `db reset` always yields a playable environment.
4. CI deploys migrations: PR → `supabase db reset` + typecheck + lint; merge to `main` → `supabase db push` to production (project ref + access token as repo secrets).

## 3.3 Disaster Recovery

- **Backups:** Supabase daily backups from day one; enable PITR before first real users (M2 launch). Weekly `supabase db dump -f backups/$(date).sql` to private off-site storage — paranoia tier.
- **Migrations are forward-only.** Never rewrite an applied migration; fix mistakes with a new corrective migration ("roll forward"). `down` scripts are not worth maintaining solo.
- **Restore drill (run once before launch):** create a throwaway project → apply all migrations → restore latest dump → verify counts. An untested backup is a rumor.
- **Secrets:** `.env` files git-ignored; production keys only in CI secrets and EAS secrets. The `service_role` key never ships in the app bundle — Expo only ever sees the `anon` key.

## 3.4 Strategy-Shift Protocol (when product requirements mutate)

1. **Absorb volatility in `jsonb` first.** Scoring rules, circuit points, listing payloads already live in config columns — most pivots are an app-code change, not a migration.
2. **Expand → migrate → contract** for breaking changes: add the new column/table (expand), backfill + dual-write (migrate), drop the old shape only after the app fully switched (contract). Never a destructive change in one step.
3. **Additive bias:** new enum values (`alter type ... add value`), new nullable columns, and new tables are cheap and zero-downtime. Renames and type changes are expensive — avoid by choosing names carefully (done) and tolerating slightly stale names internally.
4. **Feature gating:** ship dormant schema (like the chat tables) ahead of UI. The database may run ahead of the product; the product must never run ahead of the database.
5. **Decision log:** keep `docs/decisions.md` — one paragraph per pivot (what changed, why, migration number). Six-months-later-you is a different developer.

---

# 4. AI-Agent Context Artifact

The complete file is at [`ai-architecture-context.md`](./ai-architecture-context.md) — copy it to the repo root (and reference it from `CLAUDE.md` / `.cursorrules`) so every future AI coding session inherits the architecture baseline without regression.
