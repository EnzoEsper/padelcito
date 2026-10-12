# Feature specification: Match card states and section contract

- **Status:** Implementing
- **Owner/date:** 2026-10-07
- **Related docs/code:**
  - UI: [`src/features/matches/components/match-summary-card.tsx`](../../src/features/matches/components/match-summary-card.tsx), [`src/features/matches/components/match-status-badge.tsx`](../../src/features/matches/components/match-status-badge.tsx), [`app/(app)/matches.tsx`](<../../app/(app)/matches.tsx>)
  - Logic: [`src/features/matches/match-display.ts`](../../src/features/matches/match-display.ts), [`src/features/matches/match-lifecycle.ts`](../../src/features/matches/match-lifecycle.ts), [`src/features/matches/use-matches.ts`](../../src/features/matches/use-matches.ts)
  - Lifecycle DB: [`20260623120000_rename_match_completed_to_finished.sql`](../../supabase/migrations/20260623120000_rename_match_completed_to_finished.sql) (`sync_match_lifecycle`)

## 1. User problem and outcome

On the Matches calendar, a single card can show conflicting information: for example **Cancelled** in the header and **Accepted** in the footer. Footer avatars may show venue/sport initials instead of real players. Join placeholders (`+`) appear when joining is impossible. Past matches can still show **Open** in lists because lifecycle sync runs only on match detail.

**Outcome:** Each calendar match card presents one coherent story. Header lifecycle, viewer relationship, roster, and actions are derived from a single pure resolver. Discover cards keep distance-only header styling but use real roster avatars from the same data.

## 2. Scope

### In scope

- Section contract for `MatchSummaryCard` (header, schedule, chips, roster, viewer status, action).
- Display-only effective lifecycle aligned with `sync_match_lifecycle` for list cards.
- Calendar tabs only for header badges and viewer status; Discover unchanged except roster avatars.
- Real roster preview (host first, then accepted participants by `requested_at`).
- List rebucketing: Upcoming includes live; History is finished/cancelled, newest first.
- Rename participant footer label **Accepted** → **Confirmed** (no pulse when confirmed).

### Out of scope

- Visual redesign of the card chrome.
- Discover relationship pills (Hosting / Joined / Requested).
- DB migrations or writing effective status from the client.
- Showing withdrawn/removed/rejected matches in calendar lists.

## 3. Card sections (contract)

1. **Header** — Title; **Host** pill when viewer is host; **lifecycle pill** (single source of truth for match state).
2. **Schedule** — Day, time range, duration (unchanged).
3. **Chips** — Category, gender, difficulty (unchanged).
4. **Roster** — Real avatars, optional **+N** overflow, `filled/capacity`, label always **Players**; **+** empty slots only when match is joinable (effective open, spots remain).
5. **Viewer status** — Shown only before match start (effective pre-start); never contradicts lifecycle (hidden for cancelled, live, finished).
6. **Action** — Rate when owed; chevron (unchanged).

## 4. State matrix (calendar)

Effective lifecycle: `cancelled` → cancelled; else if `now >= starts_at + duration` → finished; else if `now >= starts_at` → in_progress (Live); else stored `open` / `full`.

| Viewer / stored | Effective lifecycle | Header | Viewer status | Join placeholders | Muted |
|-----------------|---------------------|--------|---------------|---------------------|-------|
| Host, open/full | open/full | HOST + OPEN/FULL | N REQUESTS (if pending) | if open & spots | no |
| Player accepted | open/full | OPEN/FULL | CONFIRMED | if open & spots | no |
| Player pending | open/full | OPEN/FULL | PENDING | if open & spots | no |
| Anyone | live | LIVE | (hidden) | no | no |
| Anyone | finished | FINISHED | (hidden) | no | yes |
| Anyone | cancelled | CANCELLED | (hidden) | no | yes |

**Exclusions:** Pending tab drops matches when host cancels (existing filter). Withdrawn/removed/rejected never listed.

## 5. User scenarios and acceptance criteria

### Scenario: Player sees cancelled match

Given the host cancelled a match where the player was accepted, when the player opens History, then the card shows **Cancelled** only (no **Confirmed** footer) and no join placeholders.

- [ ] Footer membership label is absent for cancelled matches.
- [ ] Card uses muted styling and neutral category accent.

### Scenario: Stale open match after start time

Given DB status is still `open` but `starts_at` is in the past and end time not reached, when the match appears in Upcoming, then the header shows **Live** and viewer status is hidden.

- [ ] Effective lifecycle matches `sync_match_lifecycle` rules without calling RPC on list fetch.

### Scenario: Real roster on card

Given accepted participants visible under RLS, when any match card renders, then avatars show host and accepted players' display names (initials), not sport or venue names.

- [ ] **+N** bubble when more filled players exist than avatar slots shown.

## 6. Constraints and existing contracts

- [`ai-architecture-context.md`](../../ai-architecture-context.md) — TanStack Query, RLS, padel-only MVP.
- Participant visibility: RLS on `match_participants` (own row, host, or accepted + member).
- No client writes to aggregate or lifecycle fields.

## 7. Acceptance and verification summary

- Automated: `pnpm typecheck`, `pnpm lint`, `pnpm test` (including `match-card-state.test.ts`).
- Manual: cancelled-as-player card, host with pending inbox, past open row in list, Discover roster avatars.
- Risks: none identified (display-only).
