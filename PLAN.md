# PLAN.md — Blu-ray Collection Tracker

A phased plan to build a single-user, local-first web app for tracking a Blu-ray
movie collection. See `CLAUDE.md` for stack and conventions.

## Goals

- Add movies by **title** (search OMDb, pick the right result).
- Add movies by **scanning a barcode** with the device camera.
- Browse owned titles in a **poster gallery**.
- **Search/filter** and **delete** from the gallery.
- Persist everything locally in SQLite; no accounts.

## Key decisions

- **Platform:** responsive web app (desktop + mobile browser).
- **Metadata:** OMDb, proxied via the backend.
- **Storage:** local SQLite, single user, no auth.
- **Barcode reality check:** A Blu-ray barcode is a **UPC/EAN** that identifies a
  retail product, not an IMDb title. OMDb cannot look up a UPC. So the scan flow is:
  `camera → barcode digits → UPC provider → product title → OMDb search → user
  confirms match → save`. The UPC step is imperfect (product names are messy), so
  the UI must let the user correct/confirm the matched title before saving.

### UPC provider options (pick during Phase 4)

- **UPCitemdb** — has a free trial tier (rate-limited, no key for trial); easy to
  start with.
- **Barcode Lookup / go-upc** — richer data, paid.
- Keep this behind `server/services/upc.js` so the provider can be swapped. If no
  provider is configured, the scan flow falls back to: show the decoded barcode and
  let the user type the title manually.

## Data model

`movies` table (one row per owned title):

| column        | type    | notes                                    |
|---------------|---------|------------------------------------------|
| id            | INTEGER | primary key                              |
| imdb_id       | TEXT    | OMDb `imdbID`, unique (prevents dupes)   |
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

## API surface (backend)

- `GET  /api/movies?q=<search>` — list owned movies, optional local filter.
- `POST /api/movies` — add a movie by `imdbID` (backend fetches full OMDb details).
- `DELETE /api/movies/:id` — remove a movie.
- `GET  /api/search?title=<title>` — proxy OMDb title search (returns candidates).
- `GET  /api/lookup?barcode=<upc>` — UPC provider → product title → OMDb candidates.

---

## Phases

### Phase 0 — Scaffolding
- [ ] Init `package.json`, install deps (express, better-sqlite3, vite, react).
- [ ] Set up Vite + React frontend and Express backend; dev proxy `/api` → backend.
- [ ] `.gitignore` (`node_modules`, `.env`, `/data/*.db`), `.env.example`.
- [ ] `npm run dev` runs both; a placeholder page loads.

### Phase 1 — Database & collection API
- [ ] SQLite init + `movies` schema/migration on startup.
- [ ] `GET /api/movies`, `DELETE /api/movies/:id`, `POST /api/movies`.
- [ ] Unique constraint on `imdb_id`; adding a dupe is a no-op / clear error.

### Phase 2 — Gallery view (read + delete)
- [ ] Poster grid of owned titles, responsive.
- [ ] Client-side **search box** to filter the gallery.
- [ ] Delete button per card with confirm.
- [ ] Empty state ("No movies yet — add one").

### Phase 3 — Add by title
- [ ] OMDb search service (`server/services/metadata.js`) + `GET /api/search`.
- [ ] "Add movie" UI: type title → show candidate results (poster, year) → pick →
      `POST /api/movies` → appears in gallery.
- [ ] Handle no-results, OMDb errors, and duplicate-already-owned.

### Phase 4 — Add by barcode scan
- [ ] Choose + integrate UPC provider (`server/services/upc.js`) + `GET /api/lookup`.
- [ ] Camera scanner UI with `@zxing/browser` (request camera permission, handle
      denial / no camera).
- [ ] Scan → barcode → lookup → show matched candidates → user confirms → save.
- [ ] Fallback: if UPC lookup fails, show the barcode and route to title search.
- [ ] Store the `barcode` on the saved row.

### Phase 5 — Polish
- [ ] Loading / error states across all flows.
- [ ] Movie detail view (click a card → plot, cast, rating).
- [ ] Sort options (title, year, date added) and genre filter.
- [ ] Basic tests for the API and services.
- [ ] README with setup instructions.

## Out of scope (for now)

- User accounts / multi-user / cloud sync.
- Native mobile app.
- Lending tracker, wishlist, ratings/reviews by the user.
- Non-movie media (TV box sets, 4K vs Blu-ray edition tracking) — revisit later.

## Risks / open questions

- **UPC match quality:** product databases return noisy names; confirmation step is
  essential. May need fuzzy-matching the product title against OMDb results.
- **OMDb limits:** free tier is 1,000 requests/day — fine for personal use; cache
  search results within a session if needed.
- **Mobile camera:** scanning needs HTTPS (or `localhost`) for camera access in
  most browsers; note this for any non-localhost deployment.
