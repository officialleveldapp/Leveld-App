# Google Sign-In on iOS — complete setup (Leveld)

This app implements **Google Sign-In for the native iOS app only**. It does **not** use Expo Go, Web OAuth clients, `auth.expo.io`, or `exp://` redirects.

**Supported runtimes**

- iOS **development build**: `npx expo run:ios` (Simulator or physical iPhone)
- iOS **TestFlight / App Store** builds (EAS or Xcode)

**Not supported**

- **Expo Go** — Google Sign-In will show an on-screen message instead of a working button.

---

## 1. What you are building

Flow:

1. User taps **Continue with Google** in the **Leveld iOS app** (your dev build or store build).
2. `expo-auth-session` opens the system browser / ASWebAuthenticationSession.
3. Google returns to your app using the URL scheme  
   `com.googleusercontent.apps.<CLIENT_PREFIX>:/oauth2redirect/google`  
   (derived from your iOS OAuth **CLIENT_ID**).
4. The app receives an **ID token** and sends it to your Django API: `POST /api/auth/google/` with `{ "id_token": "..." }`.
5. Django verifies the token with Google and returns JWTs (same as email/password login).

---

## 2. Google Cloud / Firebase (one project)

You already use project **leveld-65780**. You need:

### 2.1 iOS OAuth 2.0 Client ID

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select project **Leveld**.
2. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID** (or edit the existing iOS client).
3. Application type: **iOS**.
4. **Bundle ID**: must match your app exactly:  
   `com.rahbe.leveld`  
   (see `app.json` → `expo.ios.bundleIdentifier`).
5. Save and copy the **Client ID**. It looks like:  
   `818975540922-xxxx.apps.googleusercontent.com`

### 2.2 OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**.
2. While developing, set **Publishing status** to **Testing** and add your Gmail under **Test users**.
3. When you ship to the public, move to **In production** and complete any **verification** Google requests.

You do **not** need to add `exp://` or `auth.expo.io` URIs for this iOS-native flow.

### 2.3 Optional: `GoogleService-Info.plist`

If you use Firebase, the plist’s **`CLIENT_ID`** is the same iOS OAuth client ID. You can copy it from there instead of the Credentials page.

---

## 3. Xcode / Expo native config (URL scheme)

Google requires the **reversed client ID** as a URL scheme so the redirect can reopen your app.

From your Client ID  
`818975540922-abcdef.apps.googleusercontent.com`  
the **reversed scheme** is:

`com.googleusercontent.apps.818975540922-abcdef`

In this repo, `app.json` already lists:

- `com.rahbe.leveld`
- `com.googleusercontent.apps.<your-prefix>`  
  (update the third `scheme` entry if your iOS client ID prefix changes)

After changing `app.json`, run **`npx expo prebuild`** (if you use prebuild) or ensure the generated iOS project includes those **URL types** — `npx expo run:ios` handles this for the managed workflow.

---

## 4. App environment variables (`.env` in project root)

Create or edit **`.env`** (never commit real secrets if the repo is public; `.env` is gitignored here).

```env
EXPO_PUBLIC_API_URL=http://localhost:8001/api
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=PASTE_IOS_CLIENT_ID.apps.googleusercontent.com
```

### API URL on a real iPhone

`localhost` means the phone itself, not your Mac. Use your computer’s LAN IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:8001/api
```

`EXPO_PUBLIC_*` variables are inlined at **bundle** time. After any change:

```bash
npx expo start -c
```

Then **rebuild** the native app when you change Google-related native config:

```bash
npx expo run:ios
```

---

## 5. Django backend

In **`backend/.env`**:

```env
GOOGLE_OAUTH_CLIENT_IDS=PASTE_SAME_IOS_CLIENT_ID.apps.googleusercontent.com
```

If you use multiple client IDs (unusual for iOS-only), separate with commas **no spaces** (or match how your server splits them).

Start the API (example):

```bash
cd backend
source venv/bin/activate
python manage.py runserver 8001
```

Ensure `EXPO_PUBLIC_API_URL` ends with `/api` and matches how Django mounts routes (this project uses `/api/`).

---

## 6. Run the iOS app (required — not Expo Go)

From the **project root**:

```bash
cd /path/to/Leveld
npx expo run:ios
```

Pick **Simulator** or a **USB device**. When the Leveld app opens (icon is **your** app, not the blue Expo Go shell), sign in with Google.

**Do not** expect Google to work when you open the project inside **Expo Go** — by design, this implementation does not support it.

---

## 7. Production (TestFlight / App Store)

1. Use **EAS Build** or Xcode archive with the same **bundle ID** and **iOS OAuth client**.
2. Set **EAS secrets** (or CI env) for:
   - `EXPO_PUBLIC_API_URL` → `https://your-api-domain.com/api`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` → same iOS client ID (unless you create a separate client per environment; then list **all** IDs in `GOOGLE_OAUTH_CLIENT_IDS`).
3. Django: `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, strong `DJANGO_SECRET_KEY`.
4. OAuth consent screen: **In production** when ready for all users.

---

## 8. Troubleshooting

| Symptom | What to check |
|--------|----------------|
| “Continue with Google” missing / gray hint about Expo Go | You opened **Expo Go**. Run `npx expo run:ios` and use the **Leveld** dev build. |
| Google error **400 invalid_request** | Wrong **redirect URI** for the client type. Confirm **iOS** client + **native** app + `redirectUri` uses `com.googleusercontent.apps.…:/oauth2redirect/google` (handled in code). |
| Token rejected by Django | `GOOGLE_OAUTH_CLIENT_IDS` must include the **exact** client ID that signed the ID token (`aud` claim). |
| Network error after Google succeeds | Wrong `EXPO_PUBLIC_API_URL` (device vs simulator, http vs https, firewall). |

---

## 9. Code map (for maintenance)

| Piece | Location |
|-------|-----------|
| Google hook (iOS native only) | `hooks/useGoogleIdToken.ts` |
| Redirect URI helper | `lib/googleNativeRedirectUri.ts` |
| Login / signup UI | `app/auth/login.tsx`, `app/auth/signup.tsx` |
| API call | `lib/api.ts` → `apiGoogleSignIn` |
| Django verify | `backend/core/views.py` → `GoogleAuthView` |

---

That is the full path: **iOS OAuth client → bundle ID → URL schemes → `.env` → `npx expo run:ios` → backend `GOOGLE_OAUTH_CLIENT_IDS`.** No Web client or Expo proxy required for this iOS app.
