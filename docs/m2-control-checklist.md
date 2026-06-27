# M2 Control Checklist

This document is the handoff point for M2 Core Matchmaking MVP sessions.

## Scope

- Create public **padel** pickup matches (sport slug `padel`) with venue, map pin, datetime, capacity, duration, skill range, court setup (`court_count` + per-court `court_configs`), padel category band (`category_min` / `category_max`), required host preferences (`gender_preference`, `difficulty`, `position_preference`), and optional advanced fields (`price_per_player`, `age_min`, `age_max`).
- Browse the padel match feed as a list, without map UI.
- Open match details and request to join with a message.
- Let hosts accept, reject, or remove participants.
- Reveal WhatsApp contact links only through `match_contact_details()` after acceptance — **1:1 only** (no group button).
- Let requesters withdraw accepted participation or cancel pending requests (pre-start only).
- Let hosts cancel the whole match before start (`matches.status = 'cancelled'`).
- Schedule-driven lifecycle: `sync_match_lifecycle()` promotes `open/full → in_progress → finished`; post-start roster/cancel/withdraw locks enforced in DB + UI.

## Existing Contracts

- `matches.location` and `profiles.home_location` use WKT strings for PostgREST geography writes, for example `POINT(lng lat)`.
- `matches.status` enum: `open | full | in_progress | finished | cancelled`. Capacity transitions (`open ↔ full`) are trigger-maintained; time transitions (`in_progress`, `finished`) via `sync_match_lifecycle()`. Client code must not set `full`, `in_progress`, or `finished` directly (host cancel → `cancelled` only).
- `match_participants.status` is the request state machine.
- `match_contact_details(p_match_id)` is the only allowed path to other players' WhatsApp numbers; blocked when `is_match_active()` is false (`cancelled` or `finished`).
- `sync_match_lifecycle(p_match_id)` must run before match-detail fetch; authorized for host, participants, and discover viewers on public matches.
- Pre-start helpers: `is_match_pre_start()` / `is_match_roster_editable()` gate cancel, accept/reject/remove, and withdraw.
- Client mirrors: `isMatchPreStart`, `canHostCancelMatch`, `canHostManageRoster`, `canPlayerWithdraw` in `use-matches.ts`; `useMatchScheduleClock` for boundary re-renders; `resolveMatchStatusBadge()` in `match-display.ts`.
- `public_profiles` is safe for other users; direct `profiles.whatsapp_phone` reads are not.
- Padel sport is resolved via `PADEL_SPORT_SLUG` in `src/lib/padel-sport.ts`; match queries filter by padel `sport_id`.
- `matches.court_count` and `matches.court_configs` (jsonb array) must stay aligned: array length equals `court_count`. Each element has `format`, `type`, `structure`, and `surface` (see `src/lib/padel-court.ts`). DB helpers `matches_court_configs_are_valid` and `matches_court_capacity_fits` enforce shape and that per-court slot totals do not exceed `capacity`.
- `matches.category_min` / `matches.category_max` define the accepted padel category band (lower number = stronger player; `category_max <= category_min`).
- `matches.gender_preference` is required: `male`, `female`, or `mixed` (no `open` value).
- `matches.difficulty` is required: `friendly` or `competitive`.
- `matches.position_preference` is required: `any`, `drive`, or `backhand` (replaces the removed `positions_sought` column).
- `matches.price_per_player`, `matches.age_min`, and `matches.age_max` are optional; when both ages are set, `age_min <= age_max`.

## Verification Checklist

- Create a match from a completed profile.
- Confirm the created match `sport_id` references padel (slug `padel` in the `sports` table).
- Confirm it appears in Discover.
- Request to join from a second account.
- Confirm the host sees the pending request in Matches.
- Accept the request and confirm the requester sees an accepted state with footer WhatsApp to **host only** (not "roster confirmed" for the host).
- Open WhatsApp contacts after acceptance (player→host footer; host→player per roster row); message opens pre-filled with match venue and schedule.
- Test pending cancellation, accepted withdrawal, and host removal — all **before** `starts_at` only; each action shows a confirmation dialog (withdraw/remove warn inside the late-withdrawal window).
- Player cancels pending request → host receives `join_request_cancelled` in-app notification.
- Host cancels match pre-start → both devices show read-only footer; no roster remove; no WhatsApp; accepted player leaves Upcoming, appears in History (realtime).
- After `starts_at`: Cancel / remove / withdraw hidden or blocked; status badge shows **Live**; `sync_match_lifecycle` sets `in_progress`.
- After `starts_at + duration_minutes`: status **Finished**; read-only footer; no WhatsApp for anyone.
- Discover (logged-out or third account) can open public match detail without sync auth errors.

## Local Supabase and Realtime

Always start the local stack from the repo with the pinned CLI so Realtime image versions stay aligned with the migrated `realtime` schema:

```bash
npx supabase stop
npx supabase start
```

Do not mix an old global `supabase` binary with a newer stack (or vice versa). A stale Realtime container can report `SUBSCRIBED` while failing to register `postgres_changes` subscriptions.

After starting, confirm Realtime is on a current image:

```bash
docker inspect supabase_realtime_padelcito --format '{{.Config.Image}}'
```

While the app is on a match-detail screen, `realtime.subscription` should have rows and Postgres logs should not show `ON CONFLICT` errors for `realtime.subscription` inserts.

Two-device realtime smoke test:

- Host on match-detail; requester sends join → host "Pending Requests" updates within ~1s.
- Host accepts/rejects → requester footer state updates live.
- Host cancels match → requester list moves match to History within ~1s.
- Same on the Matches screen (host inbox).
