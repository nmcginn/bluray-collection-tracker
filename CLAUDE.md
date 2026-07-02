# CLAUDE.md

Guidance for working in this repository.

## Project

**Blu-ray Collection Tracker** — a responsive web app for cataloging a personal
movie (Blu-ray) collection. The owner can:

- Add movies by **title** (search + pick the right match).
- Add movies by **scanning the disc barcode** with the device camera.
- Browse owned titles in a **gallery view** (poster grid).
- **Search/filter** the gallery and **delete** titles.

It is a **single-user** app, deployed publicly but protected by a single password.
There are no accounts — one password gates the whole app.

## Stack

Deployed entirely on **Cloudflare's free tier**:

- **Frontend:** React + Vite, built to static assets and served by **Cloudflare
  Pages**. Responsive, mobile-first.
- **Backend/API:** **Cloudflare Pages Functions** (Workers runtime) under
  `/functions/api/*`. **Not** Node/Express — this is the V8/Workers runtime, so use
  the Fetch API and Web standards, not Node built-ins.
- **Database:** **Cloudflare D1** (SQLite-compatible), accessed via the `env.DB`
  binding in functions (`env.DB.prepare(...).bind(...).all()`), **not** a local
  SQLite file or `better-sqlite3`.
- **Movie metadata:** [OMDb API](https://www.omdbapi.com/) — called from the Worker
  (server-side `fetch`) so the API key never reaches the browser.
- **Barcode scanning:** `@zxing/browser` in the browser (camera → UPC/EAN string).
- **UPC → title lookup:** a pluggable provider called from the Worker (currently
  **UPCitemdb**: keyless trial endpoint by default, paid endpoint when
  `UPC_PROVIDER_KEY` is set). OMDb **cannot** resolve a UPC, so this
  product-database lookup turns the scanned barcode into a title we can then
  search in OMDb.

## Architecture & conventions

- **Workers runtime, not Node.** Functions run on V8. No `fs`, no `process.env` (use
  the `env` binding passed to each function), no `better-sqlite3`. Use `fetch`,
  `crypto.subtle`, and Web APIs. Keep dependencies Workers-compatible.
- **Secrets live in Cloudflare, never in the browser or git.** OMDb key, UPC key,
  the app password, and the cookie-signing secret are Cloudflare secrets / env
  vars, read from `env` inside functions. All external API calls happen in the
  Worker.
- **Auth is a single-password gate.** A login endpoint checks the password against
  `env.APP_PASSWORD` and sets a **signed (HMAC) session cookie** — stateless, no
  session store. Functions verify the cookie before serving data. Keep this in one
  shared helper (e.g. `functions/_lib/auth.js`).
- **D1 is the source of truth for the collection.** OMDb is only queried when adding
  a title; the movie's details are then stored in D1 so the gallery renders without
  external calls.
- **Metadata sources are abstracted.** OMDb and the UPC provider sit behind small
  helpers (e.g. `functions/_lib/omdb.js`, `functions/_lib/upc.js`) so a source can be
  swapped without touching route handlers.
- **Keep it simple.** Personal tool — prefer straightforward code over abstraction.
  No ORM, no client state library unless a real need appears.

## Layout (target)

```
/src             React frontend (components, pages)
/functions       Cloudflare Pages Functions
  /api           API routes (movies, search, lookup, login)
  /_lib          shared helpers (auth, omdb, upc, db)
/migrations      D1 schema migrations (SQL)
wrangler.toml    Cloudflare config (D1 binding, vars)
PLAN.md          Phased implementation plan
```

## Environment / secrets

Local dev uses a `.dev.vars` file (gitignored); production uses
`wrangler secret put`. Needed values:

- `OMDB_API_KEY` — free key from https://www.omdbapi.com/apikey.aspx
- `UPC_PROVIDER_KEY` — key for the chosen UPC lookup provider (see PLAN.md)
- `APP_PASSWORD` — the single login password
- `SESSION_SECRET` — random string used to sign the session cookie

The D1 database binding (`DB`) is configured in `wrangler.toml`.
Never commit `.dev.vars`.

## Commands

- `npm run dev` — Vite dev server + `wrangler pages dev` for functions/D1 locally.
- `npm run build` — build the frontend (`vite build`).
- `npm run deploy` — build + `wrangler pages deploy` (or via Git-connected auto-deploy).
- `npm run db:migrate` — apply D1 migrations (`wrangler d1 migrations apply`);
  `db:migrate:local` targets the local D1.
- `npm test` — run the vitest unit tests (`functions/_lib/*.test.js`).

## Working agreements

- Validate and handle errors on every external API call (rate limits, no match,
  network failure) and surface a clear message to the UI.
- Every data route must verify the session cookie first; unauthenticated requests
  get a 401 and the UI redirects to login.
- Don't block adding a movie on a poster being available — store what OMDb returns
  and degrade gracefully when fields are missing.
- Prefer adding to PLAN.md and checking items off as phases complete.
- **Keep every `.md` file in lock step with the code, on every change.** Docs are
  relied on here, not an afterthought. When you land a change: check off/update
  `PLAN.md` phase items, update `README.md`'s status section and any setup/command
  instructions that changed, and update `CLAUDE.md` itself if conventions or
  architecture shift. Keep entries accurate and to-the-point — describe what's
  actually true of the code today, not aspirational or historical detail.
