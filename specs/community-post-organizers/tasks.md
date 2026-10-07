# Tasks: Community post organizer contacts

- [x] SDD artifacts
- [x] Migration + types (`20261006100000_community_post_contacts.sql`)
- [x] WhatsApp templates + tests
- [x] Data layer
- [x] Create form contacts section
- [x] Detail + moderation UI
- [x] Docs
- [x] Verification log

## Verification log

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm typecheck` | Pass | 2026-10-06 |
| `pnpm lint` | Pass | |
| `pnpm test` | Pass | 21 tests incl. `post-whatsapp.test.ts` |
| Supabase local | Applied | `pnpm exec supabase migration up --local` |
| SQL manual cases | Not automated | See plan verification list |
| Device manual | Pending | Create multi-contact post → moderator confirm → approve → player wa.me |

## Post-merge reminder

```bash
pnpm exec supabase migration up --local
pnpm exec supabase gen types typescript --local > src/types/database.ts
```
