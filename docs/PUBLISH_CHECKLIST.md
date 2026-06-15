# Leveld — iOS App Store Publish Checklist

Audited: **June 10, 2026** · Updated: **June 11, 2026** (Friends/Groups/Payments cleanup)

This document captures what was verified by running the app locally, plus static code/config review for iOS App Store submission.

---

## Update — June 11, 2026 (Friends / Groups / Payments cleanup)

**Code changes shipped in this pass:**

- **Friends are now strictly follow-based** (mutual follow = friend). The legacy `Friendship` model, serializers, views, URLs (`/api/friendships/*`), admin, client `apiFriendship*` helpers, and `Friendship`/`FriendshipsResponse` types were **deleted**. Migration [`backend/core/migrations/0015_delete_friendship.py`](../backend/core/migrations/0015_delete_friendship.py) drops the table (data already mirrored into `Follow` by `0006`).
- **Friends screen rebuilt** ([`app/friends.tsx`](../app/friends.tsx)) — username search + **Friends / Following / Followers** segments, per-row actions (Add / Follow back / Unfollow / **Unfriend** with confirm), empty states, rows open the shared profile.
- **Shared user profile route** ([`app/user/[id].tsx`](../app/user/[id].tsx)) — fixed Follow / Following / **Friends** states (confirms before unfollow — kills the old silent-unfollow bug in groups), plus an **"Invite to a group"** picker (`apiCreateGroupInvite`). Profile follower/following/friends counts are now tappable.
- **Group invite UX aligned** ([`app/(tabs)/groups.tsx`](../app/(tabs)/groups.tsx)) — hero "Invite" opens an action sheet (**Invite friends** vs **Share invite link**); Members banner copy fixed; all social navigation routes through `/user/[id]`.
- **Private-group hardening** — group feed / leaderboard / challenges now return empty to non-members.
- **Paywall code fixed** ([`components/LeveldProPaywallContent.tsx`](../components/LeveldProPaywallContent.tsx)) — no more infinite spinner when RevenueCat isn't configured/ready (shows a clear error + **Try again**), and prices now come from the **real StoreKit `priceString`** with computed annual savings (falls back to marketing copy only if a price is missing).

**Payment system status:** the *code path* is now correct and resilient. What remains is **account/dashboard configuration** (App Store Connect products + RevenueCat offering/entitlement + webhook) and a **production backend** — see the two sections below.

**Related setup docs:**
- [REVENUECAT_SETUP.md](./REVENUECAT_SETUP.md)
- [GOOGLE_SIGNIN_IOS.md](./GOOGLE_SIGNIN_IOS.md)
- [SUPERWALL_LOCAL.md](./SUPERWALL_LOCAL.md)

---

## Payments + Expo (EAS) submission — step by step

Do these in order. Steps 1–4 make payments actually work; 5–8 get the build into review.

### 1. App Store Connect — subscriptions
1. App Store Connect → your app → **Subscriptions** → create a **Subscription Group** (e.g. `Leveld Pro`).
2. Add two auto-renewable products, e.g. `leveld_pro_monthly` and `leveld_pro_yearly` (the product IDs must match `getConfiguredProductIds()` in [`lib/revenuecat/constants.ts`](../lib/revenuecat/constants.ts) — update either side so they agree).
3. Set price tiers, add a **localized display name + description** and a **review screenshot** for each (Apple requires these or the product stays "Missing Metadata").
4. Fill **App Privacy** and the **Paid Apps / banking + tax** agreements (subscriptions can't go live until "Agreements, Tax, and Banking" is active).

### 2. RevenueCat dashboard
1. Create the iOS app in RevenueCat, upload the **App Store Connect API key** + **App-Specific Shared Secret** (needed for server receipt validation + webhooks).
2. Create an **Entitlement** with identifier `Leveld Pro` (must equal `LEVELD_PRO_ENTITLEMENT_ID` in [`lib/revenuecat/constants.ts`](../lib/revenuecat/constants.ts)).
3. Create **Products** for the two App Store product IDs and attach them to the entitlement.
4. Create an **Offering**, add a **Monthly** and **Annual** package, and mark the offering **Current**. (The custom paywall reads `offerings.current` and shows an error if it's missing — this is required.)
5. Copy the **Apple public SDK key** (`appl_…`) → this is `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`.

### 3. Webhook (server sync)
1. RevenueCat → Integrations → **Webhooks** → URL `https://<your-production-api>/api/webhooks/revenuecat/`.
2. Set the **Authorization header** value to the same secret as backend `REVENUECAT_WEBHOOK_SECRET` (in `backend/.env` locally / Railway env in prod). The handler is [`RevenueCatWebhookView`](../backend/core/views.py).

### 4. Backend in production (Railway or similar)
1. Deploy Django over **HTTPS**; set `DJANGO_SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `DATABASE_URL`, `REVENUECAT_WEBHOOK_SECRET`, `GOOGLE_OAUTH_CLIENT_IDS`.
2. Run `python manage.py migrate` on deploy (includes `0015_delete_friendship`) — this is **not** automated in [`backend/nixpacks.toml`](../backend/nixpacks.toml), so add it or run manually.

### 5. Link the Expo project + secrets
```bash
npm install -g eas-cli      # if needed
eas login
eas init                    # creates the project, writes extra.eas.projectId into app config
```
Set production env (either EAS "Environment variables" in the dashboard or `eas env:create`), matching [`types/env.d.ts`](../types/env.d.ts):
- `EXPO_PUBLIC_API_URL` = production HTTPS API (NOT localhost)
- `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` = `appl_…` from step 2
- `EXPO_PUBLIC_LEGAL_TERMS_URL`, `EXPO_PUBLIC_LEGAL_PRIVACY_URL` = hosted pages (**Apple requires both** for subscriptions)
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (if shipping Google sign-in)
- `EXPO_PUBLIC_WEB_GROUP_INVITE_BASE`, `EXPO_PUBLIC_IOS_APP_STORE_URL` (group invite share links)
- Leave Superwall/RevenueCat debug flags **unset** in production.

### 6. Build with EAS
```bash
eas build --platform ios --profile production
```
Fill `submit.production` in [`eas.json`](../eas.json) (Apple ID / ASC App ID / team ID, or use an ASC API key).

### 7. Submit to TestFlight + App Store
```bash
eas submit --platform ios --profile production --latest
```
- In **TestFlight**, sign in with a **Sandbox Apple ID** and verify: buy monthly, buy yearly, **Restore**, then check the entitlement unlocks Pro and the webhook flips `is_pro` on the backend.
- Confirm the paywall shows **localized real prices** and the **error/Try again** state when offline.

### 8. App Review metadata
- Screenshots, description, keywords, support URL, age rating, and the **subscription review screenshots** per product. Complete the **export-compliance** questionnaire.

---

## Run status (audited June 10, 2026)

### Backend — **PASS**

| Step | Result |
|------|--------|
| Python 3.12 venv + `pip install -r requirements.txt` | OK |
| PostgreSQL 16 (Homebrew) + `leveld` database | OK |
| `python manage.py migrate` | OK (all migrations applied; note: `core` models have unapplied changes — run `makemigrations` if needed) |
| `python manage.py seed_badges` | OK |
| `python manage.py runserver 8001` | OK |

**API smoke tests:**

| Endpoint | HTTP | Notes |
|----------|------|-------|
| `GET /api/notification-presets/` (no auth) | 401 | Requires authentication |
| `GET /api/daily-tips/` (no auth) | 401 | Requires authentication |
| `GET /api/badges/` (no auth) | 401 | Requires authentication |
| `POST /api/auth/register/` | 201 | Returns JWT + profile |
| `POST /api/auth/login/` | 200 | Requires `email` field (not `username`) |
| `GET /api/profile/` (auth) | 200 | OK |
| `GET /api/workouts/` (auth) | 200 | OK |
| `GET /api/templates/` (auth) | 200 | OK |
| `GET /api/leaderboard/` (auth) | 200 | OK |
| `GET /api/groups/` (auth) | 200 | OK |
| `GET /api/notification-presets/` (auth) | 200 | OK |
| `POST /api/auth/forgot-password/` | 200 | Returns success message but **no email is sent** (stub) |
| `POST /api/auth/google/` (invalid token) | 401 | `GOOGLE_OAUTH_CLIENT_IDS` configured in `backend/.env` |

### Frontend — **PARTIAL PASS**

| Step | Result |
|------|--------|
| `npm install` | OK |
| `npm run dev` (Metro on :8081) | OK — warns ~20 Expo packages are behind expected versions |
| `npx expo run:ios` (iPhone 17 Pro simulator) | OK after `pod install` with `LANG=en_US.UTF-8` |
| First `pod install` attempt | **Failed** — CocoaPods UTF-8 encoding error (`Encoding::CompatibilityError`) |
| App launch on simulator | OK — build succeeded, installed `com.rahbe.leveld` on iPhone 17 Pro |
| Google Sign-In button | OK — `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` configured; button renders on signup/login |
| Welcome / landing screen | Redesigned — cleaner hero, feature cards, staggered entrance animations |

**Configured locally:**
- `EXPO_PUBLIC_API_URL=http://localhost:8001/api`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — Google Sign-In enabled (requires Google test user in OAuth consent screen)
- `GOOGLE_OAUTH_CLIENT_IDS` in backend `.env` — matches frontend client ID

**Not configured in local `.env` (expected warnings at runtime):**
- `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` — IAP/paywall will not work
- `EXPO_PUBLIC_SUPERWALL_IOS_KEY` — Superwall gates fall back to RevenueCat paywall route
- `EXPO_PUBLIC_LEGAL_TERMS_URL` / `EXPO_PUBLIC_LEGAL_PRIVACY_URL` — paywall legal links no-op

**Manual UI flows not exercised in this audit** (simulator launched but not interactively stepped through): Google sign-in end-to-end, onboarding → paywall → tabs → workout logging → profile delete. Backend API connectivity is confirmed; full UI walkthrough should be done in TestFlight.

### Static analysis

| Check | Result |
|-------|--------|
| `npm run typecheck` | **1 error** — `app/(tabs)/_layout.tsx:25` — `segments.includes('track')` type error (`Argument of type '"track"' is not assignable to parameter of type 'never'`) |
| `npm run lint` | **9 errors, 42 warnings** — Errors are `react/no-unescaped-entities` in `track.tsx` (7), `+not-found.tsx` (1), `forgot-password.tsx` (1). Warnings mostly `react-hooks/exhaustive-deps` and unused imports. |

---

## Blockers (must fix before submission)

- [ ] **Hosted Terms of Service URL** — Set `EXPO_PUBLIC_LEGAL_TERMS_URL` and link from paywall footer ([`components/LeveldProPaywallContent.tsx`](../components/LeveldProPaywallContent.tsx)). Apple requires legal links for auto-renewable subscriptions.
- [ ] **Hosted Privacy Policy URL** — Set `EXPO_PUBLIC_LEGAL_PRIVACY_URL`. In-app privacy screen ([`app/(tabs)/privacy.tsx`](../app/(tabs)/privacy.tsx)) is a summary only, not a substitute for a hosted policy.
- [ ] **RevenueCat + App Store Connect products** — Create the monthly + yearly subscriptions, configure RevenueCat entitlement `Leveld Pro` + a **Current** offering, set `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`, and verify sandbox purchases + restore in TestFlight. Prices now render from the live StoreKit `priceString` (no hardcoded amount to keep in sync). See the step-by-step section above and [REVENUECAT_SETUP.md](./REVENUECAT_SETUP.md).
- [ ] **Production HTTPS API** — Deploy Django backend and set `EXPO_PUBLIC_API_URL` in EAS production secrets to the live URL (not `localhost`).
- [ ] **RevenueCat webhook** — Configure `REVENUECAT_WEBHOOK_SECRET` on Railway and point RevenueCat webhook to `POST /api/webhooks/revenuecat/`.
- [ ] **Camera/mic permission strings** — [`ios/boltexponativewind/Info.plist`](../ios/boltexponativewind/Info.plist) declares `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` with generic Bolt template text (`Allow $(PRODUCT_NAME) to access your camera`), but `expo-camera` is in dependencies and **not used in app code**. Apple may reject vague or unnecessary permissions. Either remove `expo-camera` or write specific usage descriptions.
- [ ] **EAS project linked** — No `extra.eas.projectId` in [`app.json`](../app.json). Run `eas init` and link the project before production builds.
- [ ] **App Store Connect metadata** — Screenshots, description, keywords, support URL, age rating, subscription review screenshots for each product.
- [x] **Fix TypeScript error** — `app/(tabs)/_layout.tsx` `segments.includes('track')` resolved with a type cast (June 10/11).
- [x] **Paywall infinite spinner + price mismatch** — Fixed June 11 (error/retry state + real StoreKit prices).

---

## Production setup

### Backend (Railway)

- [ ] Set `DJANGO_SECRET_KEY` (long random string)
- [ ] Set `DEBUG=False`
- [ ] Set `ALLOWED_HOSTS` to Railway hostname + any custom domain
- [ ] Set `DATABASE_URL` to Railway Postgres
- [ ] Run `python manage.py migrate` on deploy — **not automated** in [`backend/nixpacks.toml`](../backend/nixpacks.toml) (only `collectstatic` runs at build time)
- [ ] Set `REVENUECAT_WEBHOOK_SECRET` and configure webhook URL in RevenueCat dashboard
- [ ] Set `GOOGLE_OAUTH_CLIENT_IDS` if shipping Google Sign-In (must match `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`)
- [ ] Optionally set `CORS_ALLOWED_ORIGINS` if serving Expo web against production API
- [ ] Add a `/health` endpoint (recommended for monitoring; not present today)

### Frontend (EAS production env)

- [ ] `EXPO_PUBLIC_API_URL` — production HTTPS API
- [ ] `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` — RevenueCat iOS public key
- [ ] `EXPO_PUBLIC_LEGAL_TERMS_URL` — hosted terms page
- [ ] `EXPO_PUBLIC_LEGAL_PRIVACY_URL` — hosted privacy page
- [ ] `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — if shipping Google Sign-In
- [ ] `EXPO_PUBLIC_SUPERWALL_IOS_KEY` — if keeping Superwall feature gates
- [ ] `EXPO_PUBLIC_WEB_GROUP_INVITE_BASE` — used in [`app/(tabs)/groups.tsx`](../app/(tabs)/groups.tsx) for share links; **not documented in** [`.env.example`](../.env.example)
- [ ] `EXPO_PUBLIC_IOS_APP_STORE_URL` — used in group invite share links; **not documented in** `.env.example`

**Remove/unset for production:**

- [ ] `EXPO_PUBLIC_SUPERWALL_DEBUG` (currently default-on in `.env.example`)
- [ ] `EXPO_PUBLIC_REVENUECAT_DEBUG_LOGS` if set

---

## App Store Connect & EAS

- [ ] Run `eas init` — link project, add `projectId` to app config
- [ ] Configure `eas.json` submit credentials — [`eas.json`](../eas.json) `submit.production` is empty `{}`
- [ ] Create subscription group **Leveld Pro** with products `monthly` and `yearly` in App Store Connect
- [ ] Connect App Store to RevenueCat; create entitlement **Leveld Pro** and offering
- [ ] Add subscription localizations and review screenshots (paywall screenshot per product)
- [ ] Complete App Privacy questionnaire (workout data, email, purchase history, etc.)
- [ ] Complete export compliance / encryption questionnaire
- [ ] Production build: `npm run eas:build:ios`
- [ ] TestFlight sandbox testing: purchase monthly, purchase yearly, restore purchases, manage subscription
- [ ] Regenerate app icons before submission: `npm run generate:ios-icons`
- [ ] Align version/build numbers — currently `1.0.0` / `CFBundleVersion` `1` in [`app.json`](../app.json) and Info.plist

---

## Code & config cleanup

### Naming / template leftovers (Bolt starter artifacts)

- [ ] Rename or accept stale Expo slug `bolt-expo-nativewind` in [`app.json`](../app.json)
- [ ] Remove leftover `myapp` URL scheme from [`app.json`](../app.json) and [`ios/boltexponativewind/Info.plist`](../ios/boltexponativewind/Info.plist)
- [ ] Xcode target still named `boltexponativewind` — consider renaming to `Leveld` for clarity
- [ ] Root `package.json` name is `bolt-expo-starter`

### Dead / inconsistent code

- [ ] **Superwall post-onboarding mismatch** — [`app/paywall.tsx`](../app/paywall.tsx) uses RevenueCat only; [`components/PaywallNativeShell.tsx`](../components/PaywallNativeShell.tsx), [`components/PostOnboardingSuperwallPaywall.tsx`](../components/PostOnboardingSuperwallPaywall.tsx), and [`components/PaywallSuperwallSubscribeButton.tsx`](../components/PaywallSuperwallSubscribeButton.tsx) are unused. Wire Superwall or delete.
- [ ] **Forgot password** — UI at [`app/auth/forgot-password.tsx`](../app/auth/forgot-password.tsx) calls backend stub at [`backend/core/views.py`](../backend/core/views.py) (`ForgotPasswordView`) that sends no email. Implement email delivery or remove/hide the flow.
- [ ] **Logout** — [`LogoutView`](../backend/core/views.py) returns 200 but does not blacklist refresh tokens despite `token_blacklist` being installed.
- [ ] **Dev UI in production** — "Send a preview" notification button in [`app/(tabs)/profile.tsx`](../app/(tabs)/profile.tsx) is not `__DEV__`-gated.
- [ ] **Unused `expo-camera` dependency** — in [`package.json`](../package.json) but no imports in app code; still compiled into iOS build and triggers permission strings.

### Config / docs gaps

- [ ] Fix API port inconsistency — [`lib/api.ts`](../lib/api.ts) defaults to `http://localhost:8000/api`; docs and `.env.example` use port **8001**
- [ ] Add missing env vars to [`.env.example`](../.env.example) and [`types/env.d.ts`](../types/env.d.ts): `EXPO_PUBLIC_WEB_GROUP_INVITE_BASE`, `EXPO_PUBLIC_IOS_APP_STORE_URL`
- [ ] Add root `README.md` with local run instructions (backend + frontend)
- [ ] Document CocoaPods UTF-8 requirement: `export LANG=en_US.UTF-8` before `pod install` on some macOS setups
- [ ] Update Expo packages to versions Metro recommends (see run log warnings for ~20 outdated packages)
- [ ] Pin ESLint in `package.json` — first `npm run lint` auto-installed eslint and created `eslint.config.js`

### Lint / type errors (non-blocking for App Store but should fix)

- [ ] Fix `app/(tabs)/_layout.tsx:25` TypeScript error
- [ ] Fix 9 ESLint `react/no-unescaped-entities` errors in `track.tsx`, `+not-found.tsx`, `forgot-password.tsx`
- [ ] Review 42 `react-hooks/exhaustive-deps` warnings

### Support / legal content

- [ ] Replace hardcoded support email `rahbeabass@gmail.com` in [`privacy.tsx`](../app/(tabs)/privacy.tsx) and [`help-support.tsx`](../app/(tabs)/help-support.tsx) with production support address
- [ ] Add dedicated Terms of Service in-app screen or external link (privacy screen exists; terms screen does not)

---

## Testing before submit

- [ ] **Auth flow** — Email signup, login, logout, token refresh
- [ ] **Google Sign-In** — Requires native build + `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + backend `GOOGLE_OAUTH_CLIENT_IDS` + Google OAuth test user. See [GOOGLE_SIGNIN_IOS.md](./GOOGLE_SIGNIN_IOS.md). Configured locally; end-to-end tap-through not verified in this audit.
- [ ] **Onboarding → paywall → tabs** — Complete onboarding, skip or purchase at paywall, land on main tabs
- [ ] **Workout logging** — Start session, log sets, complete workout, verify XP/badges/streaks
- [ ] **Social** — Feed, friends, groups, group invites, deep link `leveld://group/{id}`
- [ ] **Premium gates** — Track tab custom template + personalized workout (Superwall placement or RevenueCat fallback)
- [ ] **Subscriptions** — Purchase, restore, manage subscription from profile
- [ ] **Account deletion** — Profile → Delete Account (Apple requirement; backend `DELETE /api/auth/delete-account/` implemented)
- [ ] **Notifications** — Daily reminders schedule correctly; remove or gate "Send a preview" dev button
- [ ] **Offline / error states** — API unreachable, expired token, paywall load failure
- [ ] **TestFlight build** on physical device before final submission

---

## Known non-blockers / post-launch

- [ ] **No crash reporting** — No Sentry, Crashlytics, or similar. Recommended for production monitoring.
- [ ] **No analytics SDK** — No Amplitude, Mixpanel, Firebase Analytics, etc. RevenueCat/Superwall dashboards cover subscription metrics only.
- [ ] **No automated tests / CI** — No test files or `.github/` workflows.
- [ ] **No Android build** — `android/` directory does not exist; iOS-only scope for this release.
- [x] **Legacy friendship API removed** — `/api/friendships/*`, the `Friendship` model, and client helpers/types were deleted June 11; friends are mutual-follow only.
- [ ] **Workout update/delete** — Backend has no PATCH/DELETE on `/api/workouts/` (create + list only).
- [ ] **Group join without privacy gate** — `GroupJoinView` allows direct join without `is_public` check (all groups forced private in migration). Note: group feed / leaderboard / challenges now return empty to non-members (June 11), so non-members only see the join hero.
- [ ] **RevenueCat `pro_expires_at`** — Webhook clears field to `None`; only `is_pro` boolean is synced.
- [ ] **Remote push** — [`boltexponativewind.entitlements`](../ios/boltexponativewind/boltexponativewind.entitlements) is empty; local notifications via `expo-notifications` work, but APNs remote push would need entitlements.
- [ ] **npm audit** — 28 vulnerabilities reported (20 moderate, 8 high) after install.
- [ ] **"AI personalized workout"** — Rule-based generator ([`lib/personalizedWorkoutGenerator.ts`](../lib/personalizedWorkoutGenerator.ts)), not ML; marketing copy should not overclaim.
- [ ] **Unapplied model migrations** — Django warns `core` models have changes not reflected in migrations.

---

## Quick local run reference

```bash
# Backend
brew services start postgresql@16   # first time: initdb per Homebrew post-install hints
cd backend && source venv/bin/activate
cp .env.example .env              # set DB_USER to your macOS username for local Postgres
python manage.py migrate
python manage.py seed_badges
python manage.py runserver 8001

# Frontend
cp .env.example .env              # set EXPO_PUBLIC_API_URL=http://localhost:8001/api
npm install
npm run dev                       # Metro on :8081

# iOS (native build required — not Expo Go)
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
cd ios && pod install && cd ..
npx expo run:ios --no-bundler
```

---

## Summary

| Area | Status |
|------|--------|
| Backend API | Feature-complete and running locally; password reset stubbed, logout incomplete |
| iOS native build | Builds and launches on simulator |
| Google Sign-In | Configured locally (client ID in `.env`); end-to-end not tap-tested |
| Payments | Documented but not configured locally; must complete App Store Connect + RevenueCat before submit |
| Legal / compliance | Hosted terms + privacy URLs missing — **submission blocker** |
| EAS / App Store Connect | Project not linked; submit config empty |
| Code quality | 1 TS error, 9 lint errors; template naming cleanup needed |

**Estimated readiness:** Core product is buildable and the API is solid. The main gaps before App Store submission are **legal URLs**, **subscription/IAP end-to-end setup**, **production backend deployment**, and **cleanup of unused permissions/dead code**.
