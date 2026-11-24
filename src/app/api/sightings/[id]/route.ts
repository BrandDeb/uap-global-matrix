/** GET /api/sightings/:id — full case file. */
import { getSighting } from '@/lib/db/queries';
import { isUuid, jsonError } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, 'Invalid id.');
  try {
    const row = await getSighting(id);
    return row ? Response.json(row) : jsonError(404, 'Not found.');
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
