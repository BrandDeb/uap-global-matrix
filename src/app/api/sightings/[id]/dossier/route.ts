/** GET /api/sightings/:id/dossier, cached AI brief + co-witness count. */
import { countCoWitnesses, getBrief } from '@/lib/db/queries';
import { isUuid, jsonError } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, 'Invalid id.');
  try {
    const [brief, coWitnessCount] = await Promise.all([getBrief(id), countCoWitnesses(id)]);
    return Response.json({ brief, coWitnessCount });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
