# UAP Global Matrix

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
| Database | Supabase (Postgres 17 + PostGIS), geography `Point/4326` |
| Media | `exifr` (EXIF/GPS extraction) |
| Styling | Tailwind CSS v4 · `lucide-react` |

## Architecture

```
Browser (Client Component, page.tsx)
  ├─ <Canvas> globe ── DataPoints (InstancedMesh, 1 draw call)
  ├─ filters ── debounced fetch ─▶ GET /api/sightings ─▶ search_sightings() RPC
  └─ submission modal ── multipart POST ─▶ POST /api/verify
                                              ├─ exifr (EXIF/GPS)
                                              ├─ deep-fake ensemble (simulated)
                                              ├─ proximity checks (simulated)
                                              ├─ Credibility Index C  ∈ [0,100]
                                              └─ INSERT uap_sightings + verification_logs
```

### Supabase clients (least privilege)

Three deliberately-separated clients under `src/lib/supabase/`:

| File | Key | Use |
|---|---|---|
| `server.ts` | service-role | Privileged writes (`POST /api/verify`); bypasses RLS. Browser-import guarded. |
| `anon.ts` | anon/publishable | Stateless **server-side reads**; RLS-enforced. No secret required. |
| `client.ts` | anon/publishable | Browser client with persisted session. |

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

Copy the template and fill in your project's values:

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>   # public, RLS-gated
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>              # server-only secret
```

> The read path (globe + `GET /api/sightings`) works with just the URL + anon
> key. The write path (`POST /api/verify`) additionally needs the service-role
> key. Never expose the service-role key to the browser.

### 3. Database

The schema lives as Supabase migrations (`uap_sightings`, `verification_logs`,
the `classification_tier` / `sensor_evidence_type` enums, the GiST + timestamp
indexes, RLS policies, the `v_uap_sightings` view, and the `search_sightings`
RPC). Apply them to a fresh project with the Supabase CLI, or run the
equivalent SQL in the SQL Editor.

### 4. Run

```bash
npm run dev      # http://localhost:3000
```

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
npx tsc --noEmit     # type-check (run after any .ts/.tsx edit)
```

## API

### `GET /api/sightings`

Filterable read feed. Filtering runs in the `search_sightings` RPC so the GiST
(bbox) and timestamp indexes are used — it scales past the row cap. Query params
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

- **RLS** is enabled on both tables. `uap_sightings` has a public-read policy;
  `verification_logs` has **no** policy on purpose (forensic data — service-role
  only).
- The read RPC is `SECURITY INVOKER` with a pinned `search_path`, so it respects
  RLS and is safe to expose to `anon`.
- Run `supabase` security advisors after schema changes. Note: PostGIS installs
  some objects (`spatial_ref_sys`, `st_estimatedextent`) in `public` that the
  linter flags — these are inherent to the extension.

## Project conventions

See [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md). Geography columns must
be `geography(Point, 4326)`; theme tokens live in `src/app/globals.css` under
`@theme inline` (Tailwind v4, no `tailwind.config.*`).
