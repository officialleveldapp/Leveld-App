# Leveld — QA Fix List

A running list of things to clean up / fix as you test the app. Fill in an entry per issue.
When you're ready for me to work through them, just say **"work the fix list"** and I'll go top to bottom.

## How to use this file
1. **Screenshots** → drop them in `qa/images/` (any filename is fine, but a short descriptive name helps, e.g. `home-empty-state.png`).
2. **Add an issue** below using the template. The more specific the better — but even a screenshot + one line works.
3. **Reference** = what it *should* look like / behave like. Link another screenshot, describe it, paste copy, give a color/spacing, or point to another screen in the app that does it right.
4. Set **Status** so we both know what's done: `TODO` / `IN PROGRESS` / `DONE` / `WON'T FIX`.

> Tip: To reference an image inline, use: `![label](images/your-file.png)`

---

## Issue template (copy this block for each new issue)

```
### [#] Short title
- **Status:** TODO
- **Screen / where:** (e.g. Home tab, Workout-by-date page, Paywall, Settings)
- **Severity:** blocker / high / medium / low / polish
- **What's wrong:**
- **Screenshot:** ![](images/filename.png)
- **Reference (what to change it to):**
- **Notes:**
```

---

## Open issues

<!-- Add issues below. Newest at the bottom or top — your call. -->

### 1. Login/Get Started after already logging out or deleting account
- **Status:** IN PROGRESS — need exact error text to pin root cause
- **Screen / where:** auth/login (and auth/signup), after sign out or delete account
- **Severity:** high (blocker for re-auth)
- **What's wrong:** After logging out or deleting account, can't log back in or create account — "google sign in fail or the thing fail". Happens on the sandbox/device build; works on local.
- **Reference (what to change it to):** User must be able to log back in / create account after logout or delete.

**Investigation so far (2026-06-17):**
- ✅ Backend ruled out: prod `/auth/google/` returns `401 Invalid token` (i.e. Google IS configured on prod, not a 503 "not configured").
- ✅ Backend delete fully cascades (User.delete → Profile + data), and Google view re-creates the account cleanly on next sign-in. Re-signup is supported server-side.
- ✅ `resetAfterSignOut()` does a full `resetRoot` to `/auth/login`, so the screen should remount fresh.
- ➡️ Conclusion: failure is **client-side in the OAuth/login flow on device builds**. Need the EXACT on-screen red error to disambiguate:
  - "Google sign-in was cancelled or failed" → `response.type === 'error'` (OAuth/WebBrowser flow never reached backend → redirect-URI / AuthSession issue).
  - "Google sign-in failed" / "Invalid Google token" → reached backend, token rejected.
  - "Failed to log in" → email/password path (backend or network).
  - "Request timed out" → network/timeout to prod.

**NEXT:** reproduce on device, screenshot the exact red error text under the form.

### 2. Fix the flow of adding workouts on the page
- **Status:** TODO
- **Screen / where:** (e.g. Home tab, Workout-by-date page, Paywall, Settings)
- **Severity:** blocker / high / medium / low / polish
- **What's wrong:**
- **Screenshot:** ![](images/filename.png)
- **Reference (what to change it to):**
- **Notes:**

---

## References / global notes
Use this section for things that apply across the app (so I apply them consistently):

- **Brand colors:** primary blue `#4C91FF`, accent gold `#FFB547`, dark bg `#0B0E14` (update if these are wrong)
- **Logo / icon:** `assets/images/logo.png`
- **Tone / copy style:** (e.g. short, motivational, no emojis — fill in)
- **Spacing / corner radius preferences:** (fill in)
- **Anything else I should always follow:**

---

## Done / changelog
Move finished items here so we keep history:

- _(nothing yet)_
