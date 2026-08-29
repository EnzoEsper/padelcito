# Push notifications setup (Padelcito)

This guide covers **Expo Push Service**, **Firebase (Android FCM v1)**, **Apple APNs (via EAS)**, **Supabase Edge Function secrets**, and **local dev** for remote push notifications.

Push delivery reuses the existing `notifications` table: when `emit_notification()` inserts a row, a pg_net trigger POSTs the record to the `push` Edge Function, which reads the recipient's Expo push tokens and calls the Expo Push API.

**Requires a development or production EAS build** — remote push does not work in Expo Go on Android (SDK 56+).

---

## 1. Architecture overview

| Layer | Component | Role |
| --- | --- | --- |
| Client | `expo-notifications` | Request permission, register Expo push token, handle tap deep links |
| Database | `push_tokens` | Store per-device Expo tokens (RLS: users manage own rows) |
| Database | `trg_push_on_notification` | AFTER INSERT on `notifications` → pg_net POST to Edge Function |
| Edge Function | `supabase/functions/push` | Map notification copy, call `exp.host/--/api/v2/push/send`, prune stale tokens |
| Expo | Expo Push Service | Relays to FCM (Android) and APNs (iOS) |

In-app notifications (bell badge, Realtime) are unchanged. Push is an additional delivery channel on the same `notifications` INSERT.

---

## 2. Install client dependencies

Dependencies are already declared in `package.json`. If setting up a fresh clone:

```bash
pnpm dlx expo install expo-notifications expo-device expo-constants
```

---

## 3. Expo access token

1. Open [Expo Access Tokens](https://expo.dev/accounts/[account]/settings/access-tokens).
2. Create a token scoped for push (enable **Enhanced Security for Push Notifications** if offered).
3. Store it as a Supabase secret (never commit):

```bash
supabase secrets set EXPO_ACCESS_TOKEN=exp_...
```

For local Edge Function serve, add to `supabase/.env.local`:

```env
EXPO_ACCESS_TOKEN=exp_...
PUSH_WEBHOOK_SECRET=<same-value-as-vault-secret-below>
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
```

---

## 4. Webhook shared secret + Vault (database trigger)

The pg_net trigger authenticates to the Edge Function with header `x-push-webhook-secret`. Both sides must share the same value.

Generate a random secret (e.g. `openssl rand -hex 32`), then create Vault secrets in **local** and **hosted** Postgres:

```sql
-- Run in SQL editor or psql (replace placeholders)
select vault.create_secret(
  'http://host.docker.internal:54321/functions/v1/push',
  'push_edge_function_url',
  'Push Edge Function URL'
);

select vault.create_secret(
  '<your-random-secret>',
  'push_webhook_secret',
  'Push webhook shared secret'
);
```

**Hosted URL example:** `https://<project-ref>.supabase.co/functions/v1/push`

Set the same secret on the Edge Function:

```bash
supabase secrets set PUSH_WEBHOOK_SECRET=<your-random-secret>
```

If Vault secrets are missing, the trigger silently skips push delivery (in-app notifications still work).

---

## 5. Android — Firebase + FCM v1

### 5.1 Create Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Create a project (or reuse the Google Cloud project used for Maps).
3. Add an **Android app** with package name `com.padelcito.app`.
4. Download **`google-services.json`** and place it at the **repo root** (`./google-services.json`).

This file contains public-facing identifiers and may be committed.

### 5.2 FCM v1 service account for EAS

1. Firebase Console → **Project settings → Service accounts**.
2. **Generate new private key** (JSON).
3. Upload to EAS:

```bash
pnpm dlx eas-cli credentials -p android
```

Select your profile → **Google Service Account** → **Manage FCM V1 key** → upload the JSON.

### 5.3 app.json

Already configured:

- `"android.googleServicesFile": "./google-services.json"`
- `expo-notifications` plugin with `./assets/notification-icon.png`

---

## 6. iOS — APNs, Google Sign-In, and EAS dev build

### 6.1 APNs via EAS

EAS provisions the APNs key when you build for iOS:

```bash
pnpm dlx eas-cli credentials -p ios
```

Bundle identifier: `com.padelcito.app` (from `app.json`).

No Firebase file is required on iOS for push — Apple Maps and APNs are separate from Firebase.

### 6.2 Google Sign-In (iOS OAuth client)

Android uses `google-services.json`. iOS needs a separate **OAuth client** in [Google Cloud Console](https://console.cloud.google.com/) (same project as Firebase):

1. **APIs & Services → Credentials → Create credentials → OAuth client ID → iOS**
2. Bundle ID: `com.padelcito.app`
3. Copy the client ID (ends with `.apps.googleusercontent.com`)

Add to `.env.local` (Metro) **and** EAS `development` environment (native build embeds the URL scheme):

```bash
pnpm dlx eas-cli env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID \
  --value "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com" \
  --environment development --visibility plaintext
```

`app.config.ts` derives the reversed URL scheme for `@react-native-google-signin/google-signin` from this value.

### 6.3 CocoaPods / AppCheckCore (Expo SDK 56)

`@react-native-google-signin/google-signin` can pull `AppCheckCore` 11.3.0, which breaks `pod install` on Expo 56 static builds. The project pins `AppCheckCore` to `11.2.0` via `expo-build-properties` in `app.config.ts`. If iOS EAS build fails at `pod install`, ensure that plugin is present and rebuild with `--clear-cache`.

### 6.4 Build and install dev client

```bash
pnpm dlx eas-cli device:create          # register iPhone UDID (once)
pnpm dlx eas-cli build --profile development --platform ios --clear-cache
```

Install from the EAS build page on the physical device, then connect to Metro:

```bash
pnpm start -- --dev-client --host lan
```

Use your PC LAN IP in `EXPO_PUBLIC_SUPABASE_URL` (not `127.0.0.1`) so the phone reaches local Supabase.

---

## 7. Deploy Edge Function

```bash
supabase functions deploy push --no-verify-jwt
```

Or rely on `supabase/config.toml`:

```toml
[functions.push]
verify_jwt = false
```

Secrets required at runtime: `EXPO_ACCESS_TOKEN`, `PUSH_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected on hosted).

---

## 8. Apply migrations

```bash
npx supabase migration up
# or full reset locally:
# npx supabase db reset

npx supabase gen types typescript --local > src/types/database.ts
```

Migrations:

- `20260823120000_create_push_tokens.sql`
- `20260823130000_push_on_notification_trigger.sql`

---

## 9. New EAS dev build (required)

Adding the `expo-notifications` config plugin requires a **new native binary**:

```bash
pnpm dlx eas-cli build --profile development --platform all
```

Install the new dev client on a **physical device** (simulators cannot receive remote push reliably).

---

## 10. Local Edge Function testing

Terminal 1 — serve the push function:

```bash
npx supabase functions serve push --env-file supabase/.env.local --no-verify-jwt
```

Terminal 2 — ensure Supabase stack is up:

```bash
npx supabase start
```

Ensure Vault secrets point `push_edge_function_url` to `http://host.docker.internal:54321/functions/v1/push`.

---

## 11. Verification checklist

1. **Token registration:** Sign in on a physical device → confirm a row appears in `push_tokens` for your user.
2. **Expo tool:** Copy the Expo push token from logs or DB → send a test message at [expo.dev/notifications](https://expo.dev/notifications).
3. **End-to-end:** Trigger a real event (e.g. join request on your match) → confirm in-app notification + device push.
4. **Foreground:** App open → push banner appears; bell badge updates via query invalidation.
5. **Background / cold start:** Tap notification → app opens to the correct screen (`match-detail`, `rate-match`, etc.).
6. **Sign-out:** Token row for the device is set `enabled = false`.

---

## 12. Troubleshooting

### No push received but in-app notification works

- Vault secrets `push_edge_function_url` / `push_webhook_secret` not set → trigger skips silently.
- Edge Function not deployed or `PUSH_WEBHOOK_SECRET` mismatch → check Supabase Function logs.
- No row in `push_tokens` for recipient → permission denied or running in Expo Go / simulator.

### `DeviceNotRegistered` / stale tokens

The Edge Function deletes tokens when Expo returns `DeviceNotRegistered` (app uninstall, token rotation). User must reopen the app while signed in to re-register.

### Android build fails — missing `google-services.json`

Download from Firebase and place at repo root. Path is referenced in `app.json` → `android.googleServicesFile`.

### Expo Go on Android

Remote push is **not supported** in Expo Go from SDK 53+. Use an EAS development build.

---

## 13. Architecture note

Business rules stay in Postgres (`emit_notification()` + triggers). Edge Functions `places-search` and `push` are **outbound integration proxies only** — they hold third-party API secrets, not domain logic. See `docs/decisions.md` and `ai-architecture-context.md` §4.
