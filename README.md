# Blu-ray Collection Tracker

A single-user web app to catalog a personal Blu-ray movie collection. Add movies
by title or by scanning the disc barcode, then browse them in a searchable poster
gallery. Deployed on Cloudflare's free tier (Pages + Functions + D1), protected by
a single password.

See [`PLAN.md`](./PLAN.md) for the phased build plan and [`CLAUDE.md`](./CLAUDE.md)
for architecture and conventions.

## Status

**Phase 0 — Scaffolding (complete).** Vite + React frontend, a Cloudflare Pages
Functions API (`/api/health`), and a D1 binding wired up and verified locally.

## Tech stack

- **Frontend:** React + Vite (static, served by Cloudflare Pages)
- **API:** Cloudflare Pages Functions (Workers runtime) in `functions/`
- **Database:** Cloudflare D1 (SQLite), bound as `env.DB`
- **Movie data:** OMDb API (called server-side)
- **Barcode scanning:** `@zxing/browser`

## Local development

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy local secrets and fill them in:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

3. Run the app (Vite on :5173 proxies `/api` to `wrangler pages dev` on :8788):

   ```sh
   npm run dev
   ```

   Open http://localhost:5173 — the page shows the API health check, including
   whether the D1 binding is reachable.

## One-time Cloudflare setup (before deploying)

```sh
wrangler d1 create bluray-tracker-db   # paste the database_id into wrangler.toml
npm run db:migrate                      # apply migrations (added in Phase 2)
wrangler pages secret put OMDB_API_KEY
wrangler pages secret put UPC_PROVIDER_KEY
wrangler pages secret put APP_PASSWORD
wrangler pages secret put SESSION_SECRET
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend + Functions/D1 locally |
| `npm run build` | Build the frontend to `dist/` |
| `npm run deploy` | Build and deploy to Cloudflare Pages |
| `npm run db:migrate` | Apply D1 migrations (remote) |
| `npm run db:migrate:local` | Apply D1 migrations (local) |
