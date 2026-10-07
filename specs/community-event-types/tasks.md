# Tasks: Community event types

- [x] SDD artifacts and English `docs/event-types.md`
- [x] Migration: enums (`20261005230000_community_event_types_enum.sql`)
- [x] Migration: post attributes + validation trigger (`20261005240000_community_event_attributes.sql`)
- [x] Migration: divisions table + RPC + RLS (`20261005250000_community_post_divisions.sql`, category range fix `20261005260000`)
- [x] `post-display.ts` + tests
- [x] Create post form + hooks + `use-posts`
- [x] Feed, detail, filters, copy
- [x] Architecture + decisions docs
- [x] Verification (typecheck, lint, test, manual notes)

## Verification log

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm typecheck` | Pass | 2026-10-05 |
| `pnpm lint` | Pass | Fixed pre-existing hook deps in `my-posts.tsx`, unused `router` in `user-reports.tsx` |
| `pnpm test` | Pass | 16 tests incl. `post-display.test.ts` |
| Supabase local | Applied | Migrations applied via `pnpm exec supabase migration up --local`; types via `pnpm exec supabase gen types typescript --local > src/types/database.ts` (use pnpm, not npx with stderr in file) |
| Supabase SQL cases | Not automated | Manual: invalid type/subtype, scoring on training, `other` without note, >12 tags, foreign rules path, divisions RPC auth, RLS read on approved vs pending |
| Device manual | Pending | Create multi-division tournament with rules images → moderate → feeds + detail |

## Post-merge reminder

After pulling migrations, run:

```bash
pnpm exec supabase migration up --local
pnpm exec supabase gen types typescript --local > src/types/database.ts
```
