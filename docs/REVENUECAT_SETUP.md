# RevenueCat Setup Guide — Leveld Pro ($6.99/mo, $26.99/yr)

Step-by-step instructions to make in-app purchases work end-to-end:
App Store Connect products, RevenueCat dashboard, webhook, sandbox testing, and production launch.

---

## 1. App Store Connect — Create Subscription Products

### 1a. Create a Subscription Group

1. Go to **App Store Connect** → your app → **Monetization** → **Subscriptions**.
2. Click **+** to create a **Subscription Group** named `Leveld Pro`.
3. A subscription group lets users switch between plans (monthly ↔ yearly) without overlapping charges.

### 1b. Create the Monthly Product

1. Inside the `Leveld Pro` group, click **+** → **Create Subscription**.
2. **Reference Name:** `Leveld Pro Monthly`
3. **Product ID:** `monthly` (must match `EXPO_PUBLIC_RC_PRODUCT_MONTHLY` or the default in `lib/revenuecat/constants.ts`)
4. **Subscription Duration:** 1 Month
5. **Subscription Prices:** Click **+**, select all territories, set price to **$6.99 USD** (Apple will calculate localized prices).
6. **Save.**

### 1c. Create the Yearly Product

1. Same group, click **+** → **Create Subscription**.
2. **Reference Name:** `Leveld Pro Yearly`
3. **Product ID:** `yearly`
4. **Subscription Duration:** 1 Year
5. **Subscription Prices:** Set to **$26.99 USD**.
6. **Save.**


### 1e. Localization

1. For each product, add at least one **Subscription Localization** (display name + description shown on the App Store).
   - Display Name: `Leveld Pro Monthly` / `Leveld Pro Yearly`
   - Description: `Unlimited workout plans, advanced stats, and premium features.`

### 1f. Review Information

1. Under each subscription, add a **Review Screenshot** (screenshot of the paywall).
2. Add **Review Notes** explaining the subscription if this is your first submission.

---

## 2. RevenueCat Dashboard — Products, Entitlement, Offering

### 2a. Connect App Store

1. Log in to [app.revenuecat.com](https://app.revenuecat.com).
2. Go to your project (or create one) → **Project Settings** → **Apps**.
3. Click **+ New App** → **Apple App Store**.
4. Enter your **Bundle ID** and upload your **App Store Connect Shared Secret**:
   - App Store Connect → your app → **General** → **App Information** → **App-Specific Shared Secret** → **Manage**.
   - Generate one if it doesn't exist, copy it, paste into RevenueCat.

### 2b. Get API Keys

1. RevenueCat → **Project Settings** → **API Keys**.
2. Copy the **Public app-specific API key** for iOS.
3. Set it in your `.env`:
   ```
   EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=appl_XXXXXXXXXXXX
   ```

### 2c. Create Products

1. Go to **Products** in the sidebar.
2. Click **+ New** and add both:
   - **App Store Product ID:** `monthly` → linked to your iOS app
   - **App Store Product ID:** `yearly` → linked to your iOS app
3. RevenueCat will verify these exist in App Store Connect.

### 2d. Create Entitlement

1. Go to **Entitlements** → **+ New**.
2. **Identifier:** `Leveld Pro` (must match `LEVELD_PRO_ENTITLEMENT_ID` in `lib/revenuecat/constants.ts` exactly).
3. Attach both products (`monthly` and `yearly`) to this entitlement.

### 2e. Create Offering

1. Go to **Offerings** → **+ New**.
2. **Identifier:** `default`
3. Mark it as **Current** (this is what `fetchOfferings()` returns by default).
4. Add two **Packages**:
   - **Package type:** Monthly → **Product:** `monthly`
   - **Package type:** Annual → **Product:** `yearly`

---

## 3. Webhook — Sync Purchases to Your Backend

The backend already has a webhook endpoint at `POST /api/webhooks/revenuecat/` (see `backend/core/views.py` → `RevenueCatWebhookView`).

### 3a. Generate a Webhook Secret

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output.

### 3b. Configure Backend

Add to your **backend `.env`**:

```
REVENUECAT_WEBHOOK_SECRET=<paste-secret-here>
```

### 3c. Configure RevenueCat Webhook

1. RevenueCat → **Project Settings** → **Integrations** → **Webhooks**.
2. **Webhook URL:** `https://your-domain.com/api/webhooks/revenuecat/`
3. **Authorization header:** `Bearer <paste-same-secret-here>`
4. **Events to send:** All (or at minimum: `INITIAL_PURCHASE`, `RENEWAL`, `EXPIRATION`, `CANCELLATION`, `UNCANCELLATION`, `REFUND`, `PRODUCT_CHANGE`, `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_EXTENDED`, `NON_RENEWING_PURCHASE`).
5. **Save** and use the **Send test event** button to verify.

### 3d. How the Webhook Works

When RevenueCat sends an event:
- `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION` → sets `profile.is_pro = True`
- `EXPIRATION`, `REFUND`, `SUBSCRIPTION_PAUSED` → sets `profile.is_pro = False`
- The `app_user_id` in the event matches your Django `Profile.pk` (because the app calls `Purchases.logIn(String(profile.id))`).

---

## 4. Environment Variables Summary

### Frontend (`.env`)

| Variable | Value | Notes |
|----------|-------|-------|
| `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` | `appl_XXXX` | Public iOS key from RC dashboard |
| `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY` | `goog_XXXX` | Public Android key (if using Android) |
| `EXPO_PUBLIC_RC_PRODUCT_MONTHLY` | `monthly` | App Store product ID (default: `monthly`) |
| `EXPO_PUBLIC_RC_PRODUCT_YEARLY` | `yearly` | App Store product ID (default: `yearly`) |
| `EXPO_PUBLIC_LEGAL_TERMS_URL` | `https://...` | Required for App Store — shown on paywall |
| `EXPO_PUBLIC_LEGAL_PRIVACY_URL` | `https://...` | Required for App Store — shown on paywall |

### Backend (`backend/.env`)

| Variable | Value | Notes |
|----------|-------|-------|
| `REVENUECAT_WEBHOOK_SECRET` | random token | Must match RC webhook Authorization header |

---

## 5. Sandbox Testing (Development)

### 5a. Create a Sandbox Tester Account

1. **App Store Connect** → **Users and Access** → **Sandbox** → **Testers**.
2. Click **+** → create a test account with a real email you can access.
3. Set a **password** and **territory** (United States for USD pricing).

### 5b. Sign In on Your Device

1. On your **physical iOS device** (not Simulator):
   - Go to **Settings** → **App Store** → scroll to bottom → **Sandbox Account**.
   - Sign in with the sandbox tester email/password.
2. On **Simulator**: sandbox purchases work automatically with `StoreKit Configuration` — you don't need a sandbox account. However, real end-to-end testing (including webhook) requires a device.

### 5c. Test the Purchase Flow

1. Run the dev build: `npx expo run:ios --device`
2. Open the app, navigate to a gated feature or Profile → "View plans".
3. Select a plan and tap Subscribe.
4. The sandbox purchase dialog will appear — use your sandbox credentials.
5. Sandbox subscriptions renew quickly:
   - **1 month** → renews every **5 minutes**
   - **1 year** → renews every **1 hour**
   - Auto-renewal happens up to **6 times** then stops.

### 5d. Verify the Purchase

1. After purchasing, check the Profile screen — it should show "Active" for Leveld Pro.
2. In **RevenueCat Dashboard** → **Customers** → search by your sandbox user ID — verify the active subscription and entitlement.
3. Check your **backend logs** or database — `Profile.is_pro` should be `True` after the webhook fires.

### 5e. Test Restore

1. Delete and reinstall the app.
2. Open Profile → tap "Restore purchases".
3. It should find the existing sandbox subscription and restore Pro status.

### 5f. Enable Debug Logging (Optional)

Add to `.env` for verbose RevenueCat SDK logs:
```
EXPO_PUBLIC_REVENUECAT_DEBUG_LOGS=1
```

---

## 6. Production Checklist

### 6a. App Store Requirements for Subscriptions

Apple requires the following for apps with auto-renewable subscriptions:

- [ ] **Terms of Use link** — set `EXPO_PUBLIC_LEGAL_TERMS_URL` (shown on paywall footer).
- [ ] **Privacy Policy link** — set `EXPO_PUBLIC_LEGAL_PRIVACY_URL`.
- [ ] **Restore Purchases button** — already implemented on both the paywall modal and the Profile screen.
- [ ] **Subscription management** — users can manage/cancel from Profile → "Manage subscription".
- [ ] **Clear pricing disclosure** — the paywall shows the real price from RevenueCat dynamically.
- [ ] **Auto-renewal disclosure** — the paywall footer includes renewal language.

### 6b. RevenueCat Production Setup

- [ ] Verify the **Current offering** in RevenueCat has both packages (Monthly + Annual).
- [ ] Verify the **entitlement** `Leveld Pro` has both products attached.
- [ ] Test webhook delivery in RevenueCat dashboard (send a test event).
- [ ] Remove `EXPO_PUBLIC_REVENUECAT_DEBUG_LOGS` from production `.env`.

### 6c. App Store Connect Submission

- [ ] Add **subscription localization** (display name + description) for each product.
- [ ] Add **review screenshot** of the paywall for each subscription.
- [ ] Submit the app for review — Apple will test the subscription flow in sandbox.
- [ ] In **App Privacy** section, disclose purchase history data if applicable.

### 6d. Backend Production

- [ ] Deploy backend with `REVENUECAT_WEBHOOK_SECRET` set in environment.
- [ ] Ensure the webhook URL uses **HTTPS** (RevenueCat requires it).
- [ ] Verify the webhook URL is publicly accessible (not behind auth).
- [ ] The webhook endpoint already returns 200 for unknown `app_user_id` values (safe for edge cases).

### 6e. After Launch

- Monitor the **RevenueCat Dashboard** → **Overview** for revenue, active subscribers, and churn.
- Check **Events** for webhook delivery status and any failures.
- Use **RevenueCat Charts** for MRR, trial conversion, and retention metrics.

---

## 7. How Purchases Flow Through the App

```
User taps "Subscribe" on paywall
  → RevenueCat SDK calls Apple StoreKit
  → Apple processes payment
  → RevenueCat SDK returns CustomerInfo with active entitlement
  → App checks customerInfoHasLeveldPro(info) → true
  → App calls refreshProfile() to sync with backend
  → RevenueCat webhook fires → backend sets profile.is_pro = True
  → User has Pro access everywhere
```

The app uses **two sources** to determine Pro status:
1. **RevenueCat entitlement** (`hasLeveldProEntitlement`) — instant, device-side
2. **Backend `profile.is_pro`** — set by webhook, used for server-gated features

`isEffectivelyPro` = either source is true, so the user gets Pro access immediately after purchase even if the webhook hasn't fired yet.

---

## 8. Pricing Reference

| Plan | Price | Store Product ID | RevenueCat Package Type |
|------|-------|-----------------|------------------------|
| Monthly | $6.99/month | `monthly` | Monthly |
| Yearly | $26.99/year (~$2.25/mo) | `yearly` | Annual |

The savings displayed on the paywall (e.g., "Save 68%") is calculated automatically by comparing the annual price against 12x the monthly price.
