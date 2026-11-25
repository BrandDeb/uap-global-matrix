/**
 * GET /api/alerts?lat&lon&km&since → new citizen sightings near a point.
 * Coordinates are used for this query only and never stored or logged.
 */
import { nearbySince } from '@/lib/db/queries';
import { jsonError } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get('lat'));
  const lon = Number(q.get('lon'));
  const km = Math.min(2000, Math.max(5, Number(q.get('km')) || 250));
  const sinceMs = Date.parse(q.get('since') ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return jsonError(400, 'Bad coordinates.');
  const since = new Date(Number.isFinite(sinceMs) ? Math.max(sinceMs, Date.now() - 7 * 86_400_000) : Date.now() - 3_600_000).toISOString();
  try {
    return Response.json({ items: await nearbySince(lat, lon, km, since), now: new Date().toISOString() });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
