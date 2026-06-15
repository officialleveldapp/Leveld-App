# Leveld Admin Panel

A superuser-only React dashboard for managing Leveld, served by the Django backend at
`https://api.leveldai.com/panel`. It talks to admin-only JWT endpoints under `/api/admin/`.

## What it does

- **Overview** — total users, paying users (`Profile.is_pro`), conversion rate, active users
  (7/30d), workouts logged, and 30-day signup/workout trend charts.
- **Users** — searchable/filterable table; user detail with the ability to **grant/revoke Pro**,
  **deactivate/reactivate**, and **delete** accounts.
- **Workouts** — browse logged workouts and inspect the stored exercise JSON.
- **Groups & Challenges** — browse and delete groups; browse challenges.
- **Content** — full CRUD for Daily Tips, Workout Library Templates, Notification Presets, and Badges.

Access is restricted to Django **superusers**. The login endpoint rejects non-superusers, and every
`/api/admin/*` endpoint requires a superuser JWT (`IsSuperuser` permission).

## Architecture

- Backend admin API: `backend/core/admin_api/` (permissions, pagination, serializers, views, urls),
  mounted at `/api/admin/` from `backend/core/urls.py`.
- SPA serving: `backend/leveld/views.py` (`PanelView`) serves the built `index.html` for any
  `/panel/*` path; hashed assets are served by WhiteNoise from `/static/panel/`.
- Dashboard source: `admin-dashboard/` (Vite + React + TS + Tailwind + TanStack Query + React Router + Recharts).
  `npm run build` outputs to `backend/panel_dist/`, which `collectstatic` gathers into `STATIC_ROOT/panel`.

## Local development

1. Backend (terminal A):
   ```bash
   cd backend
   DEBUG=True venv/bin/python manage.py migrate
   DEBUG=True venv/bin/python manage.py createsuperuser
   DEBUG=True venv/bin/python manage.py runserver 8000
   ```
2. Dashboard (terminal B):
   ```bash
   cd admin-dashboard
   npm install
   npm run dev
   ```
   Open the Vite URL (e.g. http://localhost:5173/). `admin-dashboard/.env.development` points the
   app at `http://localhost:8000/api`; the backend allows all CORS origins when `DEBUG=True`.

To test the production serving locally:
```bash
cd admin-dashboard && npm run build      # -> backend/panel_dist/
cd ../backend && DEBUG=True venv/bin/python manage.py collectstatic --noinput
DEBUG=True venv/bin/python manage.py runserver 8000
# visit http://localhost:8000/panel/
```

## Building for production

The dashboard build is committed to `backend/panel_dist/` so the Railway service (root = `backend/`)
ships it and `collectstatic` (run in `nixpacks.toml`) serves it. **After any dashboard change, rebuild
and commit:**

```bash
cd admin-dashboard
npm run build        # writes backend/panel_dist/
git add backend/panel_dist
```

(If you later move `admin-dashboard/` inside `backend/` or change the Railway root, you can instead add
a Node build phase to `backend/nixpacks.toml` before `collectstatic` and stop committing `panel_dist/`.)

## Deploy (Railway) + DNS

Backend service (root directory = `backend/`) environment variables:

| Variable | Value |
|----------|-------|
| `DEBUG` | `False` |
| `DJANGO_SECRET_KEY` | strong random secret |
| `ALLOWED_HOSTS` | `api.leveldai.com` |
| `DATABASE_URL` | Railway Postgres URL |
| `REVENUECAT_WEBHOOK_SECRET` | same value as the RevenueCat dashboard |
| `CORS_ALLOWED_ORIGINS` | `https://leveldai.com` (only needed if the landing page calls the API) |

Create the admin user on the Railway shell:
```bash
python manage.py createsuperuser
```

DNS:
- `api.leveldai.com` → Railway backend. Serves both `/api/*` and `/panel`.
- `leveldai.com` → landing-page host (Vercel / Netlify / Cloudflare Pages).

The panel is same-origin with the API (`api.leveldai.com`), so no CORS/CSRF configuration is required
for it (auth is Bearer JWT, not cookies).

## Admin API reference (`/api/admin/`, superuser JWT required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login/` | Superuser login → `{ access, refresh, user }` (403 for non-superusers) |
| GET | `/auth/me/` | Verify current admin session |
| GET | `/metrics/` | Dashboard metrics + 30-day series |
| GET | `/users/` | Users list (`?search=`, `?is_pro=`, `?is_active=`, `?page=`, `?ordering=`) |
| GET/PATCH/DELETE | `/users/<id>/` | Detail; PATCH `{is_pro?, is_active?}`; DELETE account |
| GET | `/workouts/` | Workouts (`?user=`, `?date_from=`, `?date_to=`) |
| GET/DELETE | `/groups/`, `/groups/<id>/` | Browse / delete groups |
| GET | `/challenges/` | Browse challenges (`?group=`) |
| CRUD | `/content/daily-tips/` | Daily tips |
| CRUD | `/content/library-templates/` | Workout library templates |
| CRUD | `/content/notification-presets/` | Notification personality presets |
| CRUD | `/content/badges/` | Badges |

Refresh uses the existing `POST /api/auth/refresh/`.

## Notes / limitations

- "Paying users" is the current `Profile.is_pro` count. There is no historical subscription log, so
  paying-users-over-time cannot be charted retroactively. (A future `ProStatusEvent` table written from
  the RevenueCat webhook + admin Pro toggles would enable this.)
- You cannot delete your own account or another superuser from the panel.
