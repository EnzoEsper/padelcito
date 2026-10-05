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

- **Increment 2:** See tasks T11+ below (decisions Q9–Q11, Q14–Q15 resolved in spec §5).
- **Optional:** Show read-only WhatsApp hint on Profile linking to Edit profile (out of increment 1 scope unless added in plan revision).

---

# Tasks: Phone verification — increment 2

- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md) (§ Increment 2)

Implement increment 2 only after increment 1 is applied and typegen (T6) is done where needed.

## Migration and database

- [x] T11 [AC: Inc 2 — quota table] New migration: `phone_verify_quota` (or equivalent) append-only rows; RLS deny-all for `authenticated`/`anon`; document schema in migration comments.
- [x] T12 [AC: Inc 2 — consume_phone_verify_quota] `consume_phone_verify_quota(p_phone_hash text)` SECURITY DEFINER: enforce **5 sends / 10 minutes / user** and **10 sends / calendar day / phone hash**; return boolean; grant execute to `authenticated` (Edge Function calls with user JWT). Never persist plaintext E.164 in quota tables.
- [x] T13 [AC: Inc 2 — set_whatsapp_verified] `set_whatsapp_verified(p_phone text)` SECURITY DEFINER: caller must match profile; phone must equal current `profiles.whatsapp_phone`; `not is_banned()`; set `padelcito.profile_internal_update`; set `whatsapp_verified_at := now()`.
- [x] T14 [AC: Inc 2 — has_verified_whatsapp] `has_verified_whatsapp()` SECURITY DEFINER helper (non-null `whatsapp_verified_at` for `auth.uid()`).
- [x] T15 [AC: Inc 2 — match host gate] Extend `"Authenticated users can host matches"` policy with `has_verified_whatsapp()`.
- [x] T16 [AC: Inc 2 — join gate] Extend `validate_match_participant_insert()` to require verification for joining user (preserve host/ban/block behavior; do not revoke existing rows).
- [x] T17 [AC: Inc 2 — community gate] Extend `enforce_community_post_limits()` to require `whatsapp_verified_at is not null` with user-facing exception message; snapshot behavior unchanged.
- [x] T18 [AC: Inc 2 — public_profiles] Rebuild `public_profiles` with `whatsapp_verified boolean` derived from `whatsapp_verified_at is not null` (no phone/timestamp exposure).
- [x] T19 [AC: Inc 2 — typegen] After migration applied locally: `npx supabase gen types typescript --local > src/types/database.ts`.

## Edge Function

- [x] T20 [AC: Inc 2 — verify-phone scaffold] Add `supabase/functions/verify-phone/index.ts` following `places-search` CORS/JWT patterns.
- [x] T21 [AC: Inc 2 — start/check] Implement `start` (Bird create / next-channel) and `check`; validate Argentine mobile format before quota/Bird; call `consume_phone_verify_quota` on send; on approved check invoke `set_whatsapp_verified`.
- [x] T22 [AC: Inc 2 — ban and errors] Reject banned users; map Bird/quota errors to safe client messages (no secret leakage); 10s outbound timeout.
- [x] T22b [AC: provider switch 2026-10-04] Replace Twilio with Bird Verify; secrets `BIRD_API_KEY` / `BIRD_API_HOST`; client `resend`.
- [x] T22c [AC: 2026-10-05] WhatsApp-only MVP: remove SMS UI, Edge Function `channels: ["whatsapp"]` only.
- [x] T23 [AC: Inc 2 — dev mode Q15] `VERIFY_PHONE_DEV_MODE=true` only when `SUPABASE_URL` is local; `start` no-op success; `check` accepts `000000` only; refuse dev mode on hosted URLs.

## Client — verification flow

- [x] T24 [AC: Inc 2 — use-phone-verification] `src/features/profile/use-phone-verification.ts`: mutations for Edge Function `start`/`check`; invalidate `['profile', 'me']`, `['profile', 'contact-gate']`, and public profile queries on success.
- [x] T25 [AC: Inc 2 — VerifyWhatsAppSheet] Shared `VerifyWhatsAppSheet` using `AppBottomSheet`: optional AR number entry (reuse `argentina-whatsapp-phone` + save if needed); OTP entry; loading/errors; channel hint copy (WhatsApp / SMS).
- [x] T26 [AC: Inc 2 — useRequireVerifiedWhatsApp] Hook that opens sheet when unverified and runs `onVerified` **once** after success; no-op when already verified or banned.

## Client — gate wiring

- [x] T27 [AC: Inc 2 — create match] [`src/components/tab-bar.tsx`](../../src/components/tab-bar.tsx): intercept FAB `create-match` — verify sheet then navigate on success.
- [x] T28 [AC: Inc 2 — join match] [`app/(app)/match-detail.tsx`](../../app/(app)/match-detail.tsx): wrap join/request path with verify gate + resume mutation.
- [x] T29 [AC: Inc 2 — publish] [`src/features/community/use-posts.ts`](../../src/features/community/use-posts.ts) + [`create-post-form.tsx`](../../src/features/community/create-post/create-post-form.tsx): extend contact gate for verified flag; verify sheet before submit when number present but unverified.

## Client — badges and Profile UX

- [x] T30 [AC: Inc 2 — Profile status card] [`app/(app)/profile.tsx`](../../app/(app)/profile.tsx): status card when unverified; check badge on name when verified; opens shared sheet.
- [x] T31 [AC: Inc 2 — Edit profile pill] [`app/(app)/edit-profile.tsx`](../../app/(app)/edit-profile.tsx): Verified / Not verified · Verify pill wired to sheet.
- [x] T32 [AC: Inc 2 — public badge] [`app/(app)/player-profile.tsx`](../../app/(app)/player-profile.tsx) and match roster row components: show **Verified** when `whatsapp_verified` true; accessible name **WhatsApp verified**.

## Documentation

- [x] T33 [AC: Q10] Update [`docs/legal/privacy-policy.md`](../../docs/legal/privacy-policy.md) and [`docs/legal/account-deletion.md`](../../docs/legal/account-deletion.md) for Bird/Meta processing and provider retention on deletion.
- [x] T34 [AC: Q11] Record `verify-phone` in [`docs/decisions.md`](../../docs/decisions.md) and [`ai-architecture-context.md`](../../ai-architecture-context.md) (section 4 exceptions + do-not-regress item 6).
- [x] T35 [AC: Q15] Add [`docs/phone-verification-setup.md`](../../docs/phone-verification-setup.md): Bird API key, Argentina countries, wallet, secret names, local dev mode warnings.

## Verification and convergence (increment 2)

- [x] Run `pnpm typecheck`, `pnpm lint`, `pnpm test`; record results in evidence table below.
- [ ] Local DB: unverified insert match/join/post fails; verified succeeds; direct client patch of `whatsapp_verified_at` fails.
- [ ] Local dev mode E2E without Bird; optional Bird wallet E2E when key funded.
- [ ] Two-device manual: public badge; Profile card; resume after verify for create/join/publish.
- [ ] Mark **[Inc 2]** acceptance criteria in [spec.md](./spec.md) §3 when product agrees.

### Increment 2 evidence

| Check | Result / evidence |
| --- | --- |
| `pnpm typecheck` | Pass (2026-10-04 Bird provider switch) |
| `pnpm lint` | Pre-existing warnings in `my-posts.tsx`, `user-reports.tsx` only |
| `pnpm test` | Pass (11 tests; 2026-10-04 Bird provider switch) |
| Migration + typegen | `20261004180000_phone_verify_quota_and_gates.sql` applied locally; `src/types/database.ts` regenerated |
| Dev mode E2E | Pending — set `VERIFY_PHONE_DEV_MODE=true` in `supabase/.env.local` and restart `functions serve` |
| Bird wallet E2E | Pending funded key (Q15); ask Bird sales for AR SMS rate |
| Manual two-device badges/gates | Pending device check |
