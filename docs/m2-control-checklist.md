# M2 Control Checklist

This document is the handoff point for M2 Core Matchmaking MVP sessions.

## Scope

- Create public pickup matches with sport, venue, map pin, datetime, capacity, duration, and skill range.
- Browse the match feed as a list, without map UI.
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

## Verification Checklist

- Create a match from a completed profile.
- Confirm it appears in Discover.
- Request to join from a second account.
- Confirm the host sees the pending request in Matches.
- Accept the request and confirm the requester sees an accepted state.
- Open WhatsApp contacts after acceptance.
- Test pending cancellation, accepted withdrawal, and host removal.
