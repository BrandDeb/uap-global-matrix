# UAP Global Matrix

[![CI](https://github.com/BrandDeb/uap-global-matrix/actions/workflows/ci.yml/badge.svg)](https://github.com/BrandDeb/uap-global-matrix/actions/workflows/ci.yml)

A tactical, dark-themed 3D globe for visualizing and verifying UAP (unidentified
aerial phenomena) sightings. Reports are submitted with media, automatically
scored for credibility (EXIF provenance, a simulated multi-model deep-fake
ensemble, and prosaic-explanation proximity checks), persisted to PostGIS, and
plotted as instanced markers on an interactive globe coloured by credibility.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 |
| 3D | Three.js 0.184 · `@react-three/fiber` v9 · `@react-three/drei` |
| Database | Neon Postgres + PostGIS via `postgres` driver, geography `Point/4326` |
| Auth | Auth.js (NextAuth v5) — GitHub, JWT sessions (optional) |
| Motion | GSAP · Motion · Lenis · maath · `@react-three/postprocessing` |
| Media | `exifr` (EXIF/GPS extraction) |
| Styling | Tailwind CSS v4 · `lucide-react` |

## Architecture

```
Browser (client components)              Server (route handlers, Node runtime)
  ├─ <Canvas> globe, fleet, post FX
  ├─ useSocialMatrix ── poll 15s ──────▶ GET  /api/matrix?since=      ─┐
  ├─ dossier / case thread ── poll ────▶ GET  /api/sightings/:id/intel │
  │                                      POST /api/sightings/:id/intel │
  │                                      POST …/co-witness · …/upvote  ├─▶ src/lib/db/queries.ts
  ├─ feed page ────────────────────────▶ GET  /api/feed                │     (postgres → Neon)
  ├─ ⌘K / filters ─────────────────────▶ GET  /api/sightings?bbox…     │
  └─ report modal ── multipart ────────▶ POST /api/verify  (scoring)  ─┘
```

The browser never talks to the database: every read and write goes through a
route handler, and all SQL lives in `src/lib/db/queries.ts` (server-only).
Live updates are short polls with a `since` cursor. When an operator is signed
in with GitHub, writes use their verified handle; otherwise a per-browser
anonymous operator id is used.

### Credibility Index `C`

A weighted linear combination of six signals (weights sum to 1, in
`src/app/api/verify/route.ts` → `CREDIBILITY_WEIGHTS`):

`mediaAuthenticity 0.35 · prosaicImprobability 0.20 · geoConsistency 0.15 ·
exifIntegrity 0.10 · temporalConsistency 0.10 · descriptiveRichness 0.10`

`C` maps to the `source_tier` enum: `CLASS_A` (≥85) · `CLASS_B` (≥65) ·
`CLASS_C` (≥40) · `FLAGGED` (<40). The deep-fake and proximity hooks are
deterministic simulations — swap their bodies for real inference; the contracts
are stable.

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Create a free project at [neon.tech](https://neon.tech) (or add Neon from the
Vercel Marketplace, which injects the variables for you) and paste the pooled
connection string into `DATABASE_URL` and the direct one into
`DATABASE_URL_UNPOOLED`. GitHub sign-in (`AUTH_*`) and AI briefs
(`GEMINI_API_KEY`) are optional.

### 3. Database

```bash
npm run db:migrate   # apply db/schema.sql (idempotent)
npm run db:seed      # schema + ~28 well-known documented cases
npx tsx scripts/megaImport.ts   # optional: 10k NUFORC eyewitness reports
```

`db/schema.sql` creates the enums, tables (`uap_sightings`,
`verification_logs`, `uap_intel_threads`, `sighting_co_witnesses`,
`uap_intel_upvotes`, `uap_ai_briefs`, `hotspot_alerts`, `profiles`), GiST +
time indexes, the `v_uap_sightings` / `v_hotspot_alerts` views, the
`trending_sightings()` function, and the hotspot clustering trigger (≥3
sightings within 50 km / 72 h → `ELEVATED`, ≥6 → `CRITICAL_FLAP`).

### 4. Run

```bash
npm run dev      # http://localhost:3000
```

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
npm run db:migrate   # apply schema
npm run db:seed      # schema + demo data
npx tsc --noEmit     # type-check (run after any .ts/.tsx edit)
```

## API

### `GET /api/sightings`

Filterable read feed. Filtering runs in SQL on the base table so the GiST
(bbox) and timestamp indexes are used. Query params
(all optional):

| Param | Meaning |
|---|---|
| `minLat,minLng,maxLat,maxLng` | bounding box (all four required together) |
| `start,end` | ISO timestamps over `event_timestamp` |
| `minCredibility` | number 0..100 |
| `q` | text search over title + location name |
| `limit` | 1..5000 (default 1000) |

Returns `{ success, data: Sighting[], meta: { total, limit } }`.

### `POST /api/verify`

`multipart/form-data`: `file` (image/video), `latitude`, `longitude`,
`timestamp`, `title`, `description`, optional `location_name`. Runs the scoring
pipeline and inserts the sighting + an automated forensic log row. Returns the
computed credibility and tier.

## Security

- `DATABASE_URL` is server-only (`src/lib/db` imports `server-only`); clients
  reach data exclusively through the API routes, which validate ids (UUID),
  text length and handles at the boundary.
- All SQL uses parameterized tagged templates — no string-built queries from
  user input.
- AI briefs are written only by the server route, so clients cannot forge them.
- Signed-in writes take the operator handle from the Auth.js session, not the
  request body.

## Project conventions

See [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md). Geography columns must
be `geography(Point, 4326)`; theme tokens live in `src/app/globals.css` under
`@theme inline` (Tailwind v4, no `tailwind.config.*`).
