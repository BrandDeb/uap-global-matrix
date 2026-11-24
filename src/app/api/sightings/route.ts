/**
 * src/app/api/sightings/route.ts
 * ---------------------------------------------------------------------------
 * GET /api/sightings  —  Public, filterable read feed for the globe.
 *
 * Delegates to `searchSightings`, which filters on the base table so the GiST
 * spatial index (bbox `&&`) and the `event_timestamp` index are used — this
 * lets the feed scale instead of pulling the whole table and filtering in JS.
 *
 * Query params (all optional):
 *   minLat,minLng,maxLat,maxLng  bounding box (all four required together)
 *   start,end                    ISO timestamps for event_timestamp range
 *   minCredibility               number 0..100
 *   q                            text search over title + location_name
 *   limit                        1..5000 (default 1000)
 *
 * Runtime: Node.js. Not cached — request-time data.
 * ---------------------------------------------------------------------------
 */

import { searchSightings } from '@/lib/db/queries';
import {
  isClassificationTier,
  isSensorEvidenceType,
  type ClassificationTier,
  type SensorEvidenceType,
} from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

/** Flat shape consumed directly by the dashboard / globe markers. */
interface SightingDTO {
  readonly id: string;
  readonly title: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly credibilityScore: number;
  readonly eventTimestamp: string;
  readonly locationName: string;
  readonly sourceTier: ClassificationTier;
  readonly evidenceTypes: SensorEvidenceType[];
}

/* --- boundary parsing helpers ------------------------------------------- */

function finiteOrNull(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isoOrNull(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function clampLimit(raw: string | null): number {
  const n = finiteOrNull(raw);
  if (n === null) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

/**
 * Map a result row to the DTO, validating at the boundary. Rows with non-finite
 * coordinates are dropped (returns null) rather than rendered at (0,0).
 */
function toDTO(row: Record<string, unknown>): SightingDTO | null {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    latitude,
    longitude,
    credibilityScore: row.credibility_score == null ? 0 : Number(row.credibility_score),
    eventTimestamp: String(row.event_timestamp ?? ''),
    locationName: String(row.location_name ?? ''),
    sourceTier: isClassificationTier(row.source_tier) ? row.source_tier : 'FLAGGED',
    evidenceTypes: Array.isArray(row.evidence_types)
      ? row.evidence_types.filter(isSensorEvidenceType)
      : [],
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const params = new URL(request.url).searchParams;
    const maxRows = clampLimit(params.get('limit'));

    const data = await searchSightings({
      minLat: finiteOrNull(params.get('minLat')),
      minLng: finiteOrNull(params.get('minLng')),
      maxLat: finiteOrNull(params.get('maxLat')),
      maxLng: finiteOrNull(params.get('maxLng')),
      start: isoOrNull(params.get('start')),
      end: isoOrNull(params.get('end')),
      minCredibility: finiteOrNull(params.get('minCredibility')),
      q: (params.get('q') ?? '').trim() || null,
      limit: maxRows,
    });

    const sightings = (data as unknown[])
      .map((row) => toDTO(row as Record<string, unknown>))
      .filter((s): s is SightingDTO => s !== null);

    return Response.json({
      success: true,
      data: sightings,
      meta: { total: sightings.length, limit: maxRows },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
