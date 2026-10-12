# Tasks: Match card states

- [x] SDD: spec.md, plan.md, tasks.md
- [x] `resolveEffectiveMatchStatus` in match-lifecycle.ts
- [x] `resolveMatchCardState` in match-card-state.ts
- [x] MatchSummary rosterPreview + pendingRequestCount
- [x] useMyMatches rebucketing and history sort
- [x] UI wiring (badge, card, matches screen)
- [x] Unit tests + pnpm typecheck/lint/test

## Verification evidence

| Check | Result |
|-------|--------|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test` | pass (44 tests incl. match-card-state.test.ts) |
| Manual cancelled player card | not run in agent session — verify on device |
