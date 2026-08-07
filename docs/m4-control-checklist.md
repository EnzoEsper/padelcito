# M4 Control Checklist

This document is the handoff point for M4 Spatial Discovery (Discover map) sessions.

## Scope

- Discover tab **list/map toggle** with shared radius slider and category filter chips.
- **Map view:** contained rounded map card, user location dot, category-colored match pins, cluster bubbles when zoomed out.
- **Search this area:** pan away from queried center → pill appears → re-runs `nearby_matches` at new `queryCenter`.
- **Recenter:** returns `queryCenter` to user coords and animates map.
- **Synced carousel:** horizontal match cards at bottom; marker tap ↔ carousel swipe stay in sync; tap card → match detail.
- **No Places API** on Discover map — coords from `nearby_matches` RPC only (Maps SDK tiles).
- Realtime: `useDiscoverMatchesRealtime()` invalidates discover queries when matches/participants change.

## Existing Contracts

- `nearby_matches(p_lat, p_lng, p_radius_m, p_sport_id)` returns `lat`, `lng`, `distance_m` per row (plus match metadata). Always pass padel `p_sport_id` from `fetchPadelSport()`.
- `useDiscoverMatches(queryCenter, radiusKm)` hydrates `MatchSummary` with `distanceM` and `coords` (RPC lat/lng, fallback `parseGeographyPoint(match.location)`).
- `queryCenter` in `app/(app)/discover.tsx` defaults to user coords from `useDiscoverLocation()`; updated by search-this-area and recenter.
- Map body must **not** live inside a vertical `ScrollView` (gesture conflict with `MapView`).
- Clustering: `supercluster` on already-fetched RPC results — presentation only; never replace RPC spatial filtering with client-side distance filtering.
- `react-native-maps` requires EAS dev client (not Expo Go). Android needs `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in manifest via `app.config.ts` (`androidGoogleMapsApiKey`). Style with inline `customMapStyle` only — no cloud Map ID.
- Module paths: `src/features/discover/components/discover-map.tsx`, `discover-map-utils.ts`, marker/card components.

## Verification Checklist

- Open Discover with location permission granted → list shows nearby open matches with distance pills.
- Switch to map view → map renders inside rounded container (not full-bleed edge-to-edge).
- Markers appear at match locations; zoom out → clusters show counts; tap cluster → zooms in.
- Tap a marker → map centers, pin highlights (time label pill), carousel scrolls to that match.
- Swipe carousel → corresponding marker selects.
- Tap carousel card → opens match detail.
- Pan map away from current search center → "Search this area" pill appears → tap → feed/markers update for new area.
- Tap recenter → map and query return to user location.
- Change category filter or radius → both list and map reflect filtered results.
- Publish a new open match nearby (second device or account) → marker appears on map within ~1s (Realtime).
- Confirm Discover map works with Places Edge Function stopped (coords still load from Postgres).

## Related Docs

- Google Maps / Places setup and billing: [`docs/places-setup.md`](./places-setup.md) §13
- AI baseline: `ai-architecture-context.md` §12–§13
- M2 matchmaking (list feed, join flow): [`docs/m2-control-checklist.md`](./m2-control-checklist.md)
