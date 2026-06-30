# CLAUDE.md

Guidance for working in this repository.

## Project

**Blu-ray Collection Tracker** — a responsive web app for cataloging a personal
movie (Blu-ray) collection. A single user can:

- Add movies by **title** (search + pick the right match).
- Add movies by **scanning the disc barcode** with the device camera.
- Browse owned titles in a **gallery view** (poster grid).
- **Search/filter** the gallery and **delete** titles.

It is a **single-user, local-first** app — no accounts, no login. All data lives
in a local SQLite database.

## Stack

- **Frontend:** React + Vite, plain CSS (or CSS modules). Responsive, mobile-first.
- **Backend:** Node.js + Express. Serves the API and (in production) the built
  frontend.
- **Database:** SQLite (via `better-sqlite3`). One file on disk.
- **Movie metadata:** [OMDb API](https://www.omdbapi.com/) — proxied through the
  backend so the API key never reaches the browser.
- **Barcode scanning:** `@zxing/browser` in the browser (camera → UPC/EAN string).
- **UPC → title lookup:** a pluggable provider (see below). OMDb **cannot** resolve
  a UPC, so a separate product-database lookup turns the scanned barcode into a
  title we can then search in OMDb.

## Architecture & conventions

- **API keys stay server-side.** The browser never talks to OMDb or the UPC
  provider directly. All external calls go through the Express backend, which
  reads keys from environment variables (`.env`, never committed).
- **Metadata source is abstracted.** External lookups live behind a small
  interface (e.g. `server/services/metadata.js` for OMDb, `server/services/upc.js`
  for the UPC provider) so a source can be swapped without touching routes.
- **The DB is the source of truth for the collection.** OMDb is only queried when
  adding a title; once added, the movie's details are stored locally so the
  gallery renders without external calls and works offline.
- **Keep it simple.** This is a personal tool — prefer straightforward code over
  abstraction. No premature framework choices (no Redux, no ORM) unless a real
  need appears.

## Layout (target)

```
/server        Express API, services (OMDb, UPC), SQLite access
/src           React frontend (components, pages)
/data          SQLite database file (gitignored)
PLAN.md        Phased implementation plan
```

## Environment

Copy `.env.example` to `.env` and fill in:

- `OMDB_API_KEY` — free key from https://www.omdbapi.com/apikey.aspx
- `UPC_PROVIDER_KEY` — key for the chosen UPC lookup provider (see PLAN.md)
- `PORT` — backend port (default 3001)

Never commit `.env` or the SQLite file in `/data`.

## Commands

> These are the intended scripts; add them to `package.json` as the app is built.

- `npm run dev` — run backend + Vite dev server (frontend proxies `/api` to backend).
- `npm run build` — build the frontend for production.
- `npm start` — run the backend serving the built frontend.
- `npm test` — run tests.

## Working agreements

- Validate and handle errors on every external API call (rate limits, no match,
  network failure) and surface a clear message to the UI.
- Don't block adding a movie on a poster being available — store what OMDb returns
  and degrade gracefully when fields are missing.
- Prefer adding to PLAN.md and checking items off as phases complete.
