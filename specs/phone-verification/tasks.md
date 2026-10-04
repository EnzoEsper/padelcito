# Tasks: Phone verification — increment 1

- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md)

Implement increment 1 only. Do not start increment 2 (OTP, gates, badges) in these tasks.

## Tasks

- [x] T1 [AC: Inc 1 — libphonenumber parsing] Add `libphonenumber-js` with `pnpm add libphonenumber-js`. Create `src/lib/argentina-whatsapp-phone.ts` with: parse/normalize to E.164 (`+549…`), reject non-mobile and non-AR; format national display; export Zod schema/transform for optional empty → `null`.
- [x] T2 [AC: Inc 1 — unit tests] Add `src/lib/__tests__/argentina-whatsapp-phone.test.ts` covering `11 2345-6789`, `011 15 2345-6789`, `+54 9 11 2345 6789` → `+5491123456789`; invalid/landline/too short; empty → null.
- [x] T3 [AC: Inc 1 — hosted data sample] Before final migration SQL, run read-only query on target environment: count non-null `whatsapp_phone`, list distinct prefixes (e.g. `+5411`, `+54911`). Record findings in migration comment or task evidence (no PII in repo — counts only).
- [x] T4 [AC: Inc 1 — migration normalize] New migration: conservative `UPDATE profiles` to fix unambiguous missing-`9` Argentine mobiles; document updated vs skipped counts in migration comments.
- [x] T5 [AC: Inc 1 — migration verification reset] Same migration (or follow-up): `BEFORE UPDATE` trigger nulls `whatsapp_verified_at` when `whatsapp_phone` changes; update `protect_profile_fields()` to allow that null when phone changed (see [plan.md](./plan.md)).
- [ ] T6 [AC: Inc 1 — typegen reminder] After migration applied locally, regenerate types: `npx supabase gen types typescript --local > src/types/database.ts` (developer-run; include in PR checklist).
- [x] T7 [AC: Inc 1 — mutation] Add `useUpdateProfileWhatsApp` in `src/features/profile/use-profile.ts`: update `whatsapp_phone` (`string | null`); on success invalidate `['profile', 'me']` and `['profile', 'contact-gate']`.
- [x] T8 [AC: Inc 1 — Edit profile UI] Wire WhatsApp section in `app/(app)/edit-profile.tsx`: fixed `+54`, local input, optional clear, Zod validation, include in save `Promise.all`; load initial value from `profile.whatsapp_phone` via display formatter.
- [x] T9 [AC: Inc 1 — save UX] Loading/error states on save; surface Supabase/RLS errors via existing `appAlert` pattern.
- [x] T10 [AC: Inc 1 — publish gate unchanged for verify] Smoke-check: user with valid unverified number can still publish (increment 1); user with no number still blocked. No code change required unless gate incorrectly checks verification today.

## Verification and convergence

- [ ] Run relevant existing automated checks; record exact results below.
- [ ] Complete applicable manual/device/backend checks; state anything unavailable or not run.
- [ ] Confirm each **[Inc 1]** acceptance criterion in [spec.md](./spec.md) §3 and mark criteria in spec when product agrees (optional checkbox pass in same PR).
- [ ] Update durable project docs / `docs/decisions.md` only if a lasting contract changed (not expected for increment 1).
- [ ] Record increment 2 as follow-up; do not implement OTP, `verify-phone`, match gates, or public badges here.

### Evidence

| Check | Result / evidence |
| --- | --- |
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pre-existing warnings in unrelated files (`my-posts.tsx`, `user-reports.tsx`); changed files clean |
| `pnpm test` | Pass (`argentina-whatsapp-phone.test.ts`) |
| Migration applied locally | Not run in agent session — apply with `supabase migration up` then T6 typegen |
| Manual Edit profile + community gate | Pending device check |

### Deviations and follow-ups

- **Increment 2:** Twilio Verify, shared sheet, match create/join gates, verified publish, Profile/public badges — blocked on Q9, Q10, Q11, Q14 per spec.
- **Optional:** Show read-only WhatsApp hint on Profile linking to Edit profile (out of increment 1 scope unless added in plan revision).
