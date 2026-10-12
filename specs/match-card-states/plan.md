# Plan: Match card states and section contract

## Approach

1. Add `resolveEffectiveMatchStatus` in `match-lifecycle.ts` (mirror SQL, no DB writes).
2. Add `resolveMatchCardState` in `match-card-state.ts` — single resolver for pills, viewer line, roster joinability, muted, accent.
3. Extend `MatchSummary` with `rosterPreview` and `pendingRequestCount` in `use-matches.ts` hydration.
4. Rebucket `useMyMatches` filters/sorts using effective status.
5. Wire `match-status-badge.tsx`, `match-summary-card.tsx`, `matches.tsx`.
6. Tests + verification recorded in `tasks.md`.

## Files touched

| File | Change |
|------|--------|
| `src/features/matches/match-lifecycle.ts` | `resolveEffectiveMatchStatus` |
| `src/features/matches/match-card-state.ts` | new module |
| `src/features/matches/match-display.ts` | Confirmed label, optional export for card state |
| `src/features/matches/use-matches.ts` | roster preview, buckets |
| `src/features/matches/components/match-status-badge.tsx` | use card state |
| `src/features/matches/components/match-summary-card.tsx` | roster, joinable, accent |
| `app/(app)/matches.tsx` | muted from card state |
| `src/features/matches/__tests__/match-card-state.test.ts` | new tests |

## Out of scope

Discover header badges; schema migrations.
