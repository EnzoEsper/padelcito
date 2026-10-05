# Phone verification setup (Bird Verify)

Padelcito confirms WhatsApp ownership with **Bird Verify** behind the Edge Function `verify-phone`. Business rules (quotas, setting `whatsapp_verified_at`) live in Postgres — not in the Edge Function.

---

## Secrets (hosted Supabase only)

Set these in **Project Settings → Edge Functions → Secrets** (or `supabase secrets set`):

| Secret | Purpose |
| --- | --- |
| `BIRD_API_KEY` | Bird workspace API key (`bk_us1_…` or regional equivalent) |
| `BIRD_API_HOST` | Regional API host, e.g. `https://us1.platform.bird.com` (must match key region) |
| `PHONE_VERIFY_HASH_PEPPER` | Optional pepper for SHA-256 phone hashing in quota RPC (must match between app environments if you rotate it) |

**Never** set `VERIFY_PHONE_DEV_MODE=true` on hosted projects.

---

## Bird dashboard (trial or production)

1. Create a [Bird](https://bird.com) account and generate an API key for your workspace region.
2. **Verify → Countries** — enable **Argentina** with **WhatsApp** only (SMS disabled for MVP to avoid ~3× send cost).
3. Fund the workspace wallet (phone OTP sends are billed per message; email OTP in dev is free).
4. Copy the API key into `BIRD_API_KEY` and set `BIRD_API_HOST` to the matching regional host (see Bird **Base URLs and regions** docs).

Shared senders show as **Bird Verify** or **Authifly** until you attach your own WhatsApp sender in the dashboard (no app code change).

Outbound calls from `verify-phone` use a **10s fetch timeout** so the app gets a clear error instead of hanging. SMS fallback can be re-enabled later in Bird + app if needed.

---

## Local development (no Bird wallet)

1. Apply migrations: `supabase migration up`
2. In `supabase/.env.local` (used by `supabase functions serve`):

```env
VERIFY_PHONE_DEV_MODE=true
```

3. Ensure `SUPABASE_URL` points at your **local** stack (e.g. `http://127.0.0.1:54321`). The function refuses dev mode on hosted URLs.
4. Serve functions:

```bash
npx supabase functions serve --env-file supabase/.env.local
```

5. In the app: save a real Argentine mobile on **Edit profile** (e.g. `11 2345-6789`), open **Verify your WhatsApp**, tap **Send code**, then on the code step enter **`000000`** (dev mode skips Bird; do not type `000000` in the phone field).
6. Restart `functions serve` after changing `verify-phone` or env so the Edge runtime reloads.

---

## Local E2E with Bird (real OTP)

1. In `supabase/.env.local`:

```env
VERIFY_PHONE_DEV_MODE=false
BIRD_API_KEY=bk_us1_...
BIRD_API_HOST=https://us1.platform.bird.com
```

2. Restart `supabase functions serve --env-file supabase/.env.local`.
3. Smoke test: WhatsApp send → wrong code → correct code → **Verified** badge; from code step try **Resend code**.

---

## Client / database flow

1. App calls `verify-phone` with JWT (`start` then `check`). `start` sends on **WhatsApp only**; optional `resend: true` reuses Bird create for resends.
2. Edge Function validates E.164 Argentine mobile, checks `is_banned()`, calls `consume_phone_verify_quota(phone_hash)`.
3. On approved `check`, Edge Function calls RPC `set_whatsapp_verified(p_phone)`.
4. Gates: `has_verified_whatsapp()` on match host insert and join participant insert; `enforce_community_post_limits()` requires verification.

Regenerate types after migrations:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

---

## Local DB note (quota timezone)

If `verify-phone` logs `consume_phone_verify_quota failed` with an unknown timezone, apply migrations through `20261005220000_fix_phone_verify_quota_timezone.sql` (`supabase migration up`). Daily OTP caps use **`America/Buenos_Aires`**.

---

## Manual smoke test (with Bird)

1. Save a valid `+549…` number on **Edit profile**.
2. Trigger verify from **Profile** status card or create-match / join / publish gate.
3. Complete OTP on your handset via WhatsApp.
4. Confirm create match, join request, and community publish succeed; public **Verified** badge on second device.
