# M2 Control Checklist

This document is the handoff point for M2 Core Matchmaking MVP sessions.

## Scope

- Create public **padel** pickup matches (sport slug `padel`) with venue, map pin, datetime, capacity, duration, and skill range.
- Browse the padel match feed as a list, without map UI.
- Open match details and request to join with a message.
- Let hosts accept, reject, or remove participants.
- Reveal WhatsApp contact links only through `match_contact_details()` after acceptance.
- Let requesters withdraw accepted participation or cancel pending requests.

## Existing Contracts

- `matches.location` and `profiles.home_location` use WKT strings for PostgREST geography writes, for example `POINT(lng lat)`.
- `matches.status` is trigger-maintained for capacity transitions. Client code must not set `full` directly.
- `match_participants.status` is the request state machine.
- `match_contact_details(p_match_id)` is the only allowed path to other players' WhatsApp numbers.
- `public_profiles` is safe for other users; direct `profiles.whatsapp_phone` reads are not.
- Padel sport is resolved via `PADEL_SPORT_SLUG` in `src/lib/padel-sport.ts`; match queries filter by padel `sport_id`.

## Verification Checklist

- Create a match from a completed profile.
- Confirm the created match `sport_id` references padel (slug `padel` in the `sports` table).
- Confirm it appears in Discover.
- Request to join from a second account.
- Confirm the host sees the pending request in Matches.
- Accept the request and confirm the requester sees an accepted state.
- Open WhatsApp contacts after acceptance.
- Test pending cancellation, accepted withdrawal, and host removal.

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
- Same on the Matches screen (host inbox).
