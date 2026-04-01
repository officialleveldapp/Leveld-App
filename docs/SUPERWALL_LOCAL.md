# Superwall — local & development setup

Leveld shows a **Superwall paywall** after onboarding: **Sign up → Onboarding → `/paywall`** automatically registers a placement when the SDK is ready.

## Development checklist (do this in order)

### 1. Superwall project & iOS app

1. Sign in at [superwall.com/dashboard](https://superwall.com/dashboard).
2. **Settings → Keys** — copy the **Public API Key** (iOS).
3. Ensure your Superwall **iOS app** uses bundle ID **`com.rahbe.leveld`** (must match `app.json` → `expo.ios.bundleIdentifier`). If Superwall asks for the bundle ID when creating the app, use that exact value.

### 2. Env vars (project root `.env`)

```env
EXPO_PUBLIC_SUPERWALL_IOS_KEY=paste_your_public_key_here
EXPO_PUBLIC_SUPERWALL_DEBUG=1
EXPO_PUBLIC_SUPERWALL_ONBOARDING_PLACEMENT=campaign_trigger
```

- **`EXPO_PUBLIC_SUPERWALL_IOS_KEY`** — required for native paywalls. If empty, the app uses the **fallback** paywall screen (no Superwall UI).
- **`EXPO_PUBLIC_SUPERWALL_DEBUG=1`** — with **`__DEV__`** (typical `npx expo run:ios`), turns on Superwall’s **developer** network and **debug** logging.
- **`EXPO_PUBLIC_SUPERWALL_ONBOARDING_PLACEMENT`** — must match a **Placement** name in the Superwall dashboard. **`campaign_trigger`** matches Superwall’s common **example** campaign so you can test before naming your own.

After changing `.env`:

```bash
npx expo start -c
```

### 3. Campaign & placement in Superwall

1. **Placements** — create or use one whose **event name** equals your env value (default **`campaign_trigger`**).
2. **Campaigns** — link a campaign to that placement so a **Paywall** is shown when the SDK registers the placement (not “No Paywall” / holdout only, if you want to always see UI while testing).
3. **Paywall** — design can be a template from Superwall; connect **products** when you are ready to test purchases.

Superwall **does not** refetch config on Metro hot reload. After dashboard changes, **fully restart the app** (rebuild if needed).

### 4. Run a native iOS build

`expo-superwall` does **not** run in **Expo Go**.

```bash
npx expo run:ios
```

Use the **Leveld** dev app (not the blue Expo Go shell).

### 5. Test purchases (optional)

- Create subscription products in **App Store Connect** and attach them in Superwall.
- On a **physical device** or simulator (per Apple’s current rules), sign in with a **Sandbox** Apple ID under **Settings → Developer** (or App Store sandbox account) and run through the purchase flow.

---

## Requirements (summary)

| Item | Notes |
|------|--------|
| **iOS dev build** | `npx expo run:ios` |
| **Public API key** | `EXPO_PUBLIC_SUPERWALL_IOS_KEY` in `.env` |
| **Bundle ID** | `com.rahbe.leveld` in Superwall + Xcode |
| **Placement + campaign** | Match `EXPO_PUBLIC_SUPERWALL_ONBOARDING_PLACEMENT` |

---

## In-app behavior

| Environment | `/paywall` |
|-------------|------------|
| Dev build + API key | Registers placement; Superwall may present paywall. Dismiss / skip / purchase → home tabs. |
| Expo Go or no API key | Static fallback + “Continue to app”. |

**Escape hatches (native):**

- **X** (top-right) — dismiss paywall and go to tabs.  
- **`Skip (dev)`** — bottom link in `__DEV__`.  
- SDK stuck configuring (~15s) — **Continue to app**.

---

## User identity

`SuperwallIdentifyEffect` calls `identify(String(profile.id))` when a profile exists so analytics and purchases align with your user id. Backend **`is_pro`** (e.g. RevenueCat webhook) is separate—configure in Superwall + your server as needed.

---

## Files to know

| Area | File |
|------|------|
| Auto-present after onboarding | `components/PostOnboardingSuperwallPaywall.tsx` |
| Native paywall shell | `components/PaywallNativeShell.tsx` |
| Placement name | `lib/placements.ts` → `getPostOnboardingPlacement()` |
| Provider + dev logging | `contexts/PremiumGateSuperwallTree.tsx` |
| When gating is active | `lib/superwallAvailability.ts` |
| Onboarding exit | `app/onboarding.tsx` → `router.replace('/paywall')` |
