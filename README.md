# Blu-ray Collection Tracker

A single-user web app to catalog a personal Blu-ray movie collection. Add movies
by title or by scanning the disc barcode, then browse them in a searchable poster
gallery. Deployed on Cloudflare's free tier (Pages + Functions + D1), protected by
a single password.

See [`PLAN.md`](./PLAN.md) for the phased build plan and [`CLAUDE.md`](./CLAUDE.md)
for architecture and conventions.

## Status

**All application code is complete (Phases 0-6).** Password-gated auth, a
D1-backed collection API, a poster gallery with search, sort (recently added /
title / year) and a genre filter, a movie detail view, an "Add movie" flow that
searches OMDb by title, a barcode scan flow (camera → UPC lookup via UPCitemdb
→ OMDb candidates → confirm), and unit tests for the function helpers
(`npm test`). What's left is the one-time Cloudflare setup below and connecting
the repo for deploys. See [`PLAN.md`](./PLAN.md) for the full phase checklist.

Barcode lookups use UPCitemdb's keyless trial endpoint by default (rate-limited
to ~100/day); set `UPC_PROVIDER_KEY` to use the paid endpoint instead. If a
lookup fails, the UI falls back to manual title search and still saves the
scanned barcode with the movie you pick.

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

2. Copy local secrets and fill them in (a real `OMDB_API_KEY` is required for
   search/add to work — get a free one at https://www.omdbapi.com/apikey.aspx):

   ```sh
   cp .dev.vars.example .dev.vars
   ```

3. Run the app (Vite on :5173 proxies `/api` to `wrangler pages dev` on :8788):

   ```sh
   npm run dev
   ```

   Open http://localhost:5173 — log in, then browse/search/add/delete your
   collection.

## Deploying to Cloudflare

One-time setup:

```sh
wrangler d1 create bluray-tracker-db   # paste the database_id into wrangler.toml
npm run db:migrate                      # apply migrations to the production DB
wrangler pages secret put OMDB_API_KEY
wrangler pages secret put UPC_PROVIDER_KEY   # optional — omit to use the trial endpoint
wrangler pages secret put APP_PASSWORD
wrangler pages secret put SESSION_SECRET     # long random string, e.g. `openssl rand -hex 32`
```

Then either:

- **Git-connected (recommended):** in the Cloudflare dashboard, create a Pages
  project from this repo (build command `npm run build`, output dir `dist`).
  Every push to the default branch auto-deploys.
- **Manual:** `npm run deploy` builds and pushes `dist/` + `functions/` with
  `wrangler pages deploy`.

Camera-based scanning requires HTTPS, which Pages provides by default.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend + Functions/D1 locally |
| `npm run build` | Build the frontend to `dist/` |
| `npm test` | Run the vitest unit tests (auth/OMDb/UPC helpers) |
| `npm run deploy` | Build and deploy to Cloudflare Pages |
| `npm run db:migrate` | Apply D1 migrations (remote) |
| `npm run db:migrate:local` | Apply D1 migrations (local) |
