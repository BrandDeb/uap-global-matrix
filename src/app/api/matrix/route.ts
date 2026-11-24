/**
 * GET /api/matrix — globe payload: sightings (lean columns) + hotspot alerts.
 * `?since=<iso>` returns only sightings created after that instant (live
 * polling). `serverTime` is the cursor to send next time.
 */
import { listHotspots, listSightings } from '@/lib/db/queries';
import { isoOrNull, jsonError } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIGHTINGS = 12000;
const HOTSPOT_LIMIT = 10;

export async function GET(req: Request): Promise<Response> {
  try {
    const since = isoOrNull(new URL(req.url).searchParams.get('since'));
    const serverTime = new Date().toISOString();
    const [sightings, hotspots] = await Promise.all([
      listSightings({ limit: since ? 500 : MAX_SIGHTINGS, since }),
      listHotspots(HOTSPOT_LIMIT),
    ]);
    return Response.json({ sightings, hotspots, serverTime });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
