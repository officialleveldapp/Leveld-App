# Leveld Landing Page (leveldai.com)

The marketing site now lives **in this repo** at [`landing/`](../landing).
(Originally generated in `https://github.com/RahbeA/leveld-marketing-magic`.)

## Stack

- TanStack Start (React 19) SSR app
- Tailwind CSS v4 + shadcn/Radix UI
- **Cloudflare Workers** deployment (`wrangler.jsonc`, server entry `src/server.ts`)
- Build: `vite build`; dev: `vite dev` (serves on http://localhost:8080)

It is a **self-contained marketing site** — no calls to the Leveld API, no email/waitlist form wired
to a backend. So **no backend CORS or endpoint changes are required** to ship it.

## Local development

```bash
cd landing
npm install      # a bun.lock is also present if you prefer: bun install
npm run dev      # http://localhost:8080
npm run build    # production build into landing/dist
```

## Deploy to leveldai.com (Cloudflare Workers)

The worker is named `leveld-landing` (see `landing/wrangler.jsonc`).

```bash
cd landing
npm install
npm run build
npx wrangler deploy
```

Then in the Cloudflare dashboard:
1. Workers & Pages → `leveld-landing` → **Custom Domains** → add `leveldai.com` (and `www.leveldai.com`).
2. DNS for `leveldai.com` is managed by Cloudflare; the custom domain wires the apex to the worker.

(Alternatively, deploy as a static/SSR app on Vercel or Netlify and point `leveldai.com` there via DNS —
but the repo is already set up for Cloudflare, which is the path of least resistance.)

## DNS summary for the whole product

| Host | Target |
|------|--------|
| `leveldai.com` | Cloudflare Worker `leveld-landing` (this landing page) |
| `api.leveldai.com` | Railway Django backend (API at `/api`, admin panel at `/panel`) |

## If you later add a waitlist / contact form

If the landing page should capture emails into the Leveld backend:
1. Add a public endpoint on the backend (e.g. `POST /api/waitlist/`, `permission_classes=[AllowAny]`,
   throttled) that stores submissions.
2. Add `https://leveldai.com` to `CORS_ALLOWED_ORIGINS` on the backend (env var).
3. In `landing/`, POST the form to `https://api.leveldai.com/api/waitlist/`.

This is not needed for the current version of the site.
