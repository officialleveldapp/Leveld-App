# RevenueCat — Leveld integration

This app uses **`react-native-purchases`** and **`react-native-purchases-ui`** (RevenueCat Paywalls + Customer Center) with **Expo dev builds** (`npx expo run:ios` / `run:android`). Expo Go runs RevenueCat’s **preview/mock** layer only—real IAP needs a native binary.

## 1. Install (already in repo)

```bash
npx expo install react-native-purchases react-native-purchases-ui
cd ios && pod install && cd ..   # if you manage ios/ directly
npx expo run:ios
```

After dependency changes, **rebuild** the native app.

## 2. Env configuration

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` | **Public** iOS SDK key (Dashboard → **API keys**). |
| `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY` | Public Android SDK key (optional). |
| `EXPO_PUBLIC_RC_PRODUCT_*` | Optional overrides; defaults **monthly**, **yearly**, **lifetime**. |

Restart Metro after edits: `npx expo start -c`.

These keys are **not** RevenueCat **secret** API keys—they are safe to embed like other public SDK keys. Rotate in the dashboard if a key leaks.

## 3. Dashboard checklist

1. **Project** → connect **App Store Connect** (iOS) / Play Console (Android).
2. **Products** — create subscriptions / non-consumables whose **store identifiers** match what you’ll put in offerings, e.g. `monthly`, `yearly`, `lifetime` (must match App Store Connect exactly).
3. **Entitlements** — create **`Leveld Pro`** (identifier must match `LEVELD_PRO_ENTITLEMENT_ID` in `lib/revenuecat/constants.ts`).
4. Attach all three products to the **Leveld Pro** entitlement.
5. **Offerings** — e.g. `default`, set as **Current**, add three **packages** (monthly / annual / lifetime or custom) mapped to those products.
6. **Paywalls** — attach a paywall to the offering (for `react-native-purchases-ui` `presentPaywall`).
7. **Customer Center** — enable and configure in the dashboard for **Manage subscription** / support flows.
8. **Webhooks** (optional but recommended for backend `is_pro`) — `POST /api/webhooks/revenuecat/` with shared `REVENUECAT_WEBHOOK_SECRET` (see `backend/core/views.py`). Use **`app_user_id`** = **profile primary key** (same as Django `User` id / `Profile.pk`).

## 4. App behavior

Do **not** add a separate `App.tsx` / root `useEffect` that calls `Purchases.configure` — that duplicates initialization. **`RevenueCatProvider`** already chooses the platform key (iOS vs Android), sets **`LOG_LEVEL.VERBOSE`** in **`__DEV__`**, and subscribes to **CustomerInfo** updates.

| Piece | Location |
|-------|-----------|
| Configure SDK, `logIn` / `logOut`, CustomerInfo listener | `contexts/RevenueCatContext.tsx` |
| Entitlement id, product id defaults | `lib/revenuecat/constants.ts` |
| Error helpers | `lib/revenuecat/purchasesError.ts` |
| Profile: paywall, restore, Customer Center | `app/(tabs)/profile.tsx` |

- **`Purchases.logIn(String(profile.id))`** — ties purchases to your user; must match webhook `app_user_id`.
- **`hasLeveldProEntitlement`** — from RevenueCat `CustomerInfo`.
- **`isEffectivelyPro`** — entitlement **or** backend `profile.is_pro` (covers webhook delay).

## 5. Paywall & Customer Center APIs

- **`presentPaywall()`** — shows RevenueCat paywall for the **current** offering.
- **`presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'Leveld Pro' })`** — only if entitlement inactive.
- **`presentCustomerCenter()`** — modal Customer Center (manage plans, restore, refunds on iOS where supported).

All wrapped with try/catch; user cancel uses `PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR` where applicable.

## 6. Best practices

- **Single source of truth:** Use RevenueCat for **device** entitlement checks; use your **backend** (`is_pro`) for server-gated features after webhook sync.
- **Refresh profile** after purchase / restore / CustomerInfo updates with active entitlement (`refreshProfile()` in `AuthContext`).
- **Do not** call `Purchases.configure` twice in one JS runtime; the provider uses `Purchases.isConfigured()` before configuring.
- **Test** with **Sandbox** Apple IDs and TestFlight / dev builds.
- **Superwall coexistence:** You can use Superwall for marketing paywalls and RevenueCat as the purchase engine, or standardize on one stack—avoid double-charging users with conflicting flows.

## 7. Official docs

- [Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [React Native](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Paywalls (UI)](https://www.revenuecat.com/docs/tools/paywalls)
- [Customer Center](https://www.revenuecat.com/docs/tools/customer-center)
- [Identifying customers](https://www.revenuecat.com/docs/customers/identifying-customers)
