# PLAN.md — Blu-ray Collection Tracker

A phased plan to build a single-user web app for tracking a Blu-ray movie
collection, deployed on Cloudflare's free tier behind a password gate. See
`CLAUDE.md` for stack and conventions.

## Goals

- Add movies by **title** (search OMDb, pick the right result).
- Add movies by **scanning a barcode** with the device camera.
- Browse owned titles in a **poster gallery**.
- **Search/filter** and **delete** from the gallery.
- Persist everything in Cloudflare D1; protect the app with one password.

## Key decisions

- **Platform:** responsive web app (desktop + mobile browser).
- **Hosting:** Cloudflare Pages (static frontend) + Pages Functions (API). Free
  tier, no cold starts.
- **Database:** Cloudflare D1 (SQLite-compatible), via the `env.DB` binding.
- **Auth:** single password (`APP_PASSWORD`) → signed (HMAC) session cookie.
  Stateless, no accounts, no session store.
- **Metadata:** OMDb, called from the Worker so the key stays server-side.
- **Barcode reality check:** A Blu-ray barcode is a **UPC/EAN** that identifies a
  retail product, not an IMDb title. OMDb cannot look up a UPC. So the scan flow is:
  `camera → barcode digits → UPC provider → product title → OMDb search → user
  confirms match → save`. The UPC step is imperfect, so the UI must let the user
  correct/confirm the matched title before saving.

### UPC provider options (pick during Phase 5)

- **UPCitemdb** — free trial tier (rate-limited); easy to start with.
- **Barcode Lookup / go-upc** — richer data, paid.
- Keep this behind `functions/_lib/upc.js` so the provider can be swapped. If no
  provider is configured, the scan flow falls back to: show the decoded barcode and
  let the user type the title manually.

## Data model

D1 `movies` table (one row per owned title):

| column        | type    | notes                                    |
|---------------|---------|------------------------------------------|
| id            | INTEGER | primary key                              |
| imdb_id       | TEXT    | OMDb `imdbID`, UNIQUE (prevents dupes)   |
| title         | TEXT    |                                          |
| year          | TEXT    |                                          |
| rated         | TEXT    |                                          |
| runtime       | TEXT    |                                          |
| genre         | TEXT    |                                          |
| director      | TEXT    |                                          |
| actors        | TEXT    |                                          |
| plot          | TEXT    |                                          |
| poster_url    | TEXT    | nullable                                 |
| imdb_rating   | TEXT    |                                          |
| barcode       | TEXT    | nullable; UPC if added via scan          |
| added_at      | TEXT    | ISO timestamp                            |

## API surface (Pages Functions)

All data routes require a valid session cookie (401 otherwise).

- `POST /api/login` — check password, set signed session cookie.
- `POST /api/logout` — clear the cookie.
- `GET  /api/movies?q=<search>` — list owned movies, optional filter.
- `POST /api/movies` — add a movie by `imdbID` (function fetches full OMDb details).
- `DELETE /api/movies/:id` — remove a movie.
- `GET  /api/search?title=<title>` — proxy OMDb title search (returns candidates).
- `GET  /api/lookup?barcode=<upc>` — UPC provider → product title → OMDb candidates.

---

## Phases

### Phase 0 — Scaffolding
- [x] Init `package.json`; install Vite + React, `wrangler`, `@zxing/browser`.
- [x] Vite + React frontend; `functions/` with a hello `/api` route.
- [x] `wrangler.toml` with D1 binding; create the D1 database.
- [x] `.gitignore` (`node_modules`, `.dev.vars`, `dist`), `.dev.vars` for local secrets.
- [x] `npm run dev` runs Vite + `wrangler pages dev`; a placeholder page loads.

### Phase 1 — Auth (password gate)
- [x] `functions/_lib/auth.js`: HMAC-sign/verify session cookie with `SESSION_SECRET`.
- [x] `POST /api/login` (check `APP_PASSWORD`, set cookie), `POST /api/logout`.
- [x] Middleware/helper that rejects unauthenticated data requests with 401.
- [x] Login page; unauthenticated UI redirects to it; logout button.

### Phase 2 — Database & collection API
- [x] D1 migration for `movies` (with UNIQUE `imdb_id`).
- [x] `functions/_lib/db.js` helpers over `env.DB`.
- [x] `GET /api/movies`, `DELETE /api/movies/:id`, `POST /api/movies`.
- [x] Adding a duplicate is a no-op / clear error.

### Phase 3 — Gallery view (read + delete)
- [ ] Poster grid of owned titles, responsive.
- [ ] Client-side **search box** to filter the gallery.
- [ ] Delete button per card with confirm.
- [ ] Empty state ("No movies yet — add one").

### Phase 4 — Add by title
- [ ] OMDb helper (`functions/_lib/omdb.js`) + `GET /api/search`.
- [ ] "Add movie" UI: type title → candidate results (poster, year) → pick →
      `POST /api/movies` → appears in gallery.
- [ ] Handle no-results, OMDb errors, duplicate-already-owned.

### Phase 5 — Add by barcode scan
- [ ] Choose + integrate UPC provider (`functions/_lib/upc.js`) + `GET /api/lookup`.
- [ ] Camera scanner UI with `@zxing/browser` (request permission, handle
      denial / no camera).
- [ ] Scan → barcode → lookup → matched candidates → user confirms → save.
- [ ] Fallback: if UPC lookup fails, show the barcode and route to title search.
- [ ] Store the `barcode` on the saved row.

### Phase 6 — Deploy & polish
- [ ] Connect repo to Cloudflare Pages (auto-deploy on push) or `wrangler pages deploy`.
- [ ] Set production secrets (`wrangler secret put` for OMDb/UPC/password/session).
- [ ] Apply D1 migrations to the production database.
- [ ] Loading / error states across all flows; movie detail view.
- [ ] Sort options (title, year, date added) and genre filter.
- [ ] Basic tests for functions/helpers; README with setup + deploy steps.

## Out of scope (for now)

- Multi-user accounts / cloud sync across users.
- Native mobile app.
- Lending tracker, wishlist, user ratings/reviews.
- Non-movie media (TV box sets, edition tracking) — revisit later.

## Risks / open questions

- **UPC match quality:** product databases return noisy names; the confirmation
  step is essential. May need fuzzy-matching product titles against OMDb results.
- **OMDb limits:** free tier is 1,000 requests/day — fine for personal use.
- **Workers runtime constraints:** no Node built-ins; keep deps Workers-compatible
  and use Web APIs (`fetch`, `crypto.subtle`).
- **Camera needs HTTPS:** browsers require HTTPS (or `localhost`) for camera access;
  Cloudflare Pages serves HTTPS by default, so this is covered in production.
- **D1 free tier:** generous for personal use (rows read/written per day); revisit
  if usage grows.
