# Store Readiness Checklist (pre-publish)

Use this checklist **before** your first App Store / Play Store submission. Publishing steps (TestFlight, closed testing, store metadata, `eas submit`) are intentionally deferred until you are ready to launch.

## Code & database (done in repo)

- [x] Security hardening migration (`20260830120000`) — profile field guard, 1:1 contact RPC, match lifecycle locks, Places quota, community post field guard, rating insert-only
- [x] User blocks + account deletion (`20260830130000`) — `user_blocks`, `block_user` / `unblock_user`, join/contact gating, `delete_account` RPC
- [x] Block severance + feed filtering (`20260830140000`) — sever shared upcoming matches, accept-after-block hole closed, block-aware `nearby_matches` / `nearby_community_posts`
- [x] Unblock participation cleanup (`20260830150000`) — `clear_severed_participation` so re-request works after unblock
- [x] User reports (`20260830160000`) — `user_reports`, `report_user` / `resolve_user_report`, moderator `user_reported` notifications
- [x] Notification FK unlink guards (`20260830170000`, `20260830180000`) — allow `ON DELETE SET NULL` on optional notification refs during block/unblock/account deletion
- [x] In-app account deletion UI (`Account settings → Delete Account`)
- [x] Sign in with Apple (iOS) + Google Sign-In plugin registered
- [x] User block list + overflow menus on match/post detail (Report user + Block user)
- [x] Moderator **User reports** screen + existing community **Moderation** queue
- [x] Privacy / terms / deletion copy in `docs/legal/` + in-app links (`src/lib/legal-urls.ts`)
- [x] Push notifications (prior plan) — `expo-notifications`, FCM, Edge Function `push`
- [x] Export compliance flag (`ITSAppUsesNonExemptEncryption: false`)
- [x] iOS privacy manifest stub in `app.json`

## Manual QA (two test accounts recommended)

Use a regular user account and a moderator/admin account where noted.

### Blocking & unblock

- [ ] Block from match detail overflow (`...`) on host, accepted participant, and pending requester
- [ ] Block from post detail overflow on organizer row
- [ ] Blocked users list loads; unblock succeeds; re-request to same match works after unblock
- [ ] Pending join request cancelled on block; accepted roster severed on upcoming matches
- [ ] Symmetric block: blocked user cannot join, cannot get WhatsApp via match contact RPC, neither user sees the other's matches/posts in Discover
- [ ] Host cannot accept a pending player after a block is in place

### User reports (not yet fully tested)

- [ ] Report user from overflow menu (from match and post context)
- [ ] Duplicate open report updates reason instead of creating spam rows
- [ ] Moderator receives `user_reported` notification; deep link opens User reports screen
- [ ] Resolve and Ban actions work on User reports screen
- [ ] Report post flow on post detail still works

### Account deletion

- [ ] Delete account from Account settings succeeds (including when user appears as `actor_id` on others' notifications)
- [ ] Owned profile, matches, posts, blocks, tokens, and inbox notifications are removed per cascade rules

### Auth (not yet fully tested)

- [ ] Sign in with Apple on a real iOS device or TestFlight build
- [ ] Google Sign-In on Android and iOS
- [ ] OTP email sign-in and onboarding after fresh account / `db reset`

### Regression smoke

- [ ] Discover map + join request accept/reject
- [ ] Notifications list, mark read, deep links
- [ ] Push delivery (local: Edge Function `push` + vault secrets after each `db reset`)
- [ ] Community post create → moderation approve/reject
- [ ] Account settings legal links open correct URLs

## You must run locally

```bash
npx supabase db push                    # production database
npx supabase gen types typescript --local > src/types/database.ts
pnpm typecheck && pnpm lint && pnpm test
```

## Hosted Supabase (manual — Dashboard)

- [ ] Enable **Apple** provider under Authentication → Providers (Services ID, key, redirect URL)
- [ ] Confirm **Google** provider for production redirect URLs
- [ ] Enable **email confirmations** for production if using password flows (OTP recommended as-is)
- [ ] Set production **Site URL** and redirect allow-list (no localhost)
- [ ] Upgrade to **Pro** plan; enable **PITR** and daily backups before real users
- [ ] Deploy Edge Functions: `places-search`, `push`
- [ ] Set secrets: `GOOGLE_PLACES_API_KEY`, push credentials per `docs/push-setup.md`

## EAS environment (manual — Expo dashboard)

Set for `production` (and `preview` if needed):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_TERMS_URL`
- `EXPO_PUBLIC_ACCOUNT_DELETION_URL`
- `EXPO_PUBLIC_SUPPORT_EMAIL`
- Optional: `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`

## Google Cloud (manual)

- [ ] Restrict **Maps SDK** key by Android package + release SHA-1 (from EAS credentials)
- [ ] Restrict **Places API** key to Edge Function / server only
- [ ] Set billing **budget alerts**

## Legal hosting (manual — before store forms)

Host the markdown files in `docs/legal/` at public HTTPS URLs matching your `EXPO_PUBLIC_*` env vars (GitHub Pages, Cloudflare Pages, or your domain).

## Store accounts (when you start publishing — deferred)

- [ ] Apple Developer Program ($99/yr)
- [ ] Google Play Developer ($25 one-time)
- [ ] App Store Connect app record + Play Console app
- [ ] Configure `eas.json` `submit.production` (Apple Team ID, ASC App ID, Play service account)
- [ ] TestFlight / Play internal testing with reviewer demo login instructions
- [ ] Screenshots, descriptions, App Privacy + Data safety questionnaires

## Reviewer demo access

Prepare a test email whose OTP you can retrieve, or document Google/Apple test credentials, so reviewers can sign in.
