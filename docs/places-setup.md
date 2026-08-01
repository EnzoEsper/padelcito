# Google Places & Maps setup (Padelcito)

This guide covers **Google Cloud**, **Supabase Edge Function secrets**, **local dev**, and **EAS builds** for the shared place picker (`src/features/location/`).

You need **two different Google API keys**:

| Key | Where it lives | Purpose |
| --- | --- | --- |
| **Maps SDK key** | App env `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Android map tiles via `react-native-maps` (iOS uses Apple Maps — no Google key required on iOS) |
| **Places REST key** | Supabase secret `GOOGLE_PLACES_API_KEY` only | Autocomplete + Place Details via Edge Function `places-search` — **never** ship this in the app |

---

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one), e.g. `padelcito`.
3. Enable billing on the project (Places has free monthly tiers; billing must still be enabled).
4. Go to **APIs & Services → Library** and enable:
   - **Places API (New)** — required for autocomplete + details
   - **Maps SDK for Android** — required for map tiles on Android only

Do **not** enable legacy “Places API” if you can avoid it; this app uses the **New** Places endpoints only.

---

## 2. Create the Places REST key (server-side only)

1. **APIs & Services → Credentials → Create credentials → API key**.
2. Name it e.g. `padelcito-places-server`.
3. Click the key → **Edit**:
   - **Application restrictions:** **None** (mobile REST keys cannot be app-restricted; that is why we proxy through Supabase).
   - **API restrictions:** **Restrict key** → select only:
     - **Places API (New)**
4. Save.

Copy this key — you will store it only in Supabase secrets (step 4).

### Budget alert (strongly recommended)

1. **Billing → Budgets & alerts → Create budget**.
2. Set a monthly budget (e.g. USD 25) and email alerts at 50%, 90%, 100%.

---

## 3. Create the Maps SDK key (Android client)

1. **Credentials → Create credentials → API key**.
2. Name it e.g. `padelcito-maps-android`.
3. **Edit** the key:
   - **Application restrictions:** **Android apps**
   - Add package name: `com.padelcito.app`
   - Add **SHA-1 certificate fingerprint** (see below)
   - **API restrictions:** **Maps SDK for Android** only
4. Save.

Put this value in your app `.env`:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### SHA-1 for EAS builds

For **EAS development / production** builds, use the keystore EAS manages:

```bash
pnpm dlx eas-cli credentials -p android
```

Choose your build profile → note the **SHA-1** fingerprint → add it to the Android restriction on the Maps SDK key.

For **local debug** keystore (optional, if you test outside EAS):

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Add that SHA-1 as an additional entry on the same key.

---

## 4. Supabase secrets (Places REST key)

The Edge Function [`supabase/functions/places-search/index.ts`](../supabase/functions/places-search/index.ts) reads:

- `GOOGLE_PLACES_API_KEY` — your **Places REST** key from step 2
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — injected automatically when deployed

### Local

Create `supabase/.env.local` (git-ignored) or export in your shell:

```bash
# supabase/.env.local
GOOGLE_PLACES_API_KEY=AIza...
```

Serve functions locally:

```bash
supabase start
supabase functions serve places-search --env-file supabase/.env.local
```

Your app must point at local Supabase (`EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`) while testing the proxy locally.

### Production

```bash
supabase secrets set GOOGLE_PLACES_API_KEY=AIza... --project-ref YOUR_PROJECT_REF
supabase functions deploy places-search --project-ref YOUR_PROJECT_REF
```

Verify in the dashboard: **Edge Functions → places-search → Logs** after a test search from the app.

---

## 5. Database migration (rate limit)

Apply the migration that adds `consume_places_search_quota`:

```bash
supabase db reset          # local
# or
supabase db push           # linked remote
```

Regenerate TypeScript types:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Default quota: **20 requests / 60 seconds / authenticated user**.

---

## 6. App dependencies & EAS dev client

Maps require a **native module** — Expo Go is not enough.

```bash
pnpm dlx expo install react-native-maps
```

Rebuild the dev client (required after adding `react-native-maps`):

```bash
pnpm dlx eas-cli build --profile development --platform android
pnpm dlx eas-cli build --profile development --platform ios
```

Install the new build on your device, then:

```bash
pnpm start
```

---

## 7. Environment checklist

`.env` (app — never commit):

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...   # Maps SDK for Android only
```

EAS secrets (for **cloud** builds — required for Android map tiles):

The `development` profile in [`eas.json`](../eas.json) sets `"environment": "development"`. Variables must exist in that environment before `eas build`:

```bash
pnpm dlx eas-cli env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "AIza..." --environment development --visibility plaintext
```

Verify (must show at least the variable name):

```bash
pnpm dlx eas-cli env:list --environment development
```

If the list is empty after `env:create`, check `eas-cli whoami`, `eas-cli project:info`, and the Expo dashboard → Project → Environment variables.

Production (only when building the `production` profile):

```bash
pnpm dlx eas-cli env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "AIza..." --environment production --visibility plaintext
```

**Alternative:** build on your machine so `.env.local` is read at build time:

```bash
pnpm dlx eas-cli build --profile development --platform android --local
```

---

## 8. How session billing works (important)

The app generates a **v4 UUID session token** per picker session:

1. User types a query and taps **Search** → `autocomplete` with `sessionToken`.
2. User picks a result → `details` with the **same** `sessionToken`.
3. Token is discarded; the next search gets a new token.

The Edge Function forwards `sessionToken` **verbatim** to Google. If the token is missing or changes between autocomplete and details, Google bills **per request** instead of as a session.

---

## 9. Failure modes & fallbacks (built into the picker)

| Situation | User experience |
| --- | --- |
| Places proxy down / timeout | Error message + retry; map pin + on-device reverse geocode still works |
| Rate limit (429) | “Wait a minute” message; recent venues + pin still work |
| No network | Recent venues (if any) + move pin + confirm with coords |
| Location permission denied | Map defaults to Chaco region; search still works |

Hosts can always confirm a location as long as they can place the pin.

---

## 10. Testing checklist

1. Sign in to the app (Edge Function requires JWT).
2. **Create match → Location →** open picker.
3. Type `Sanfer` (or a local club) → **Search** → pick a result → map moves → **Confirm location**.
4. Publish match → open match detail → address subtitle shows `formatted_address`.
5. Repeat on **Create post** (same `LocationField`).
6. Toggle airplane mode → confirm you can still pick via map pin.

---

## Troubleshooting

### App crashes when opening Location picker (Android)

```
API key not found. Check that <meta-data android:name="com.google.android.geo.API_KEY" .../>
```

The EAS cloud build did not receive `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` at build time. The JS bundle from Metro may still have the key from `.env.local`, but the **native** Android manifest does not — maps crash immediately.

Fix:

1. Create the EAS environment variable (development) and verify with `eas env:list --environment development`.
2. Run a **new** `eas-cli build --profile development --platform android` (old APKs cannot be patched).
3. Or use `eas-cli build ... --local` so your local `.env.local` is used during the native build.

### `readRecentVenues failed` / Invalid SecureStore key

SecureStore keys cannot contain `:`. Fixed in code (`padelcito.recent_venues.v1`). This warning alone does not crash the app.

---

## 11. Future: server-side place cache

When volume grows, add a `places` table keyed by `place_id` in front of the Edge Function. See plan notes in the repo and Google ToS: `place_id` is cacheable indefinitely; `formatted_address` / lat-lng from Google may only be cached up to 30 days unless replaced by user-confirmed data (our match/post rows store user-confirmed pins).

---

## 12. Architecture note

`ai-architecture-context.md` states the database is the backend. We deliberately add a **Supabase Edge Function** only to hold the Google Places REST key securely — not as business logic. Match/post location rules remain in Postgres (`location`, `formatted_address`, `place_id` on `matches` / `community_posts`).
