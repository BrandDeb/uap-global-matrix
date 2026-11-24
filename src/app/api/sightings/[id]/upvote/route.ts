/**
 * POST /api/sightings/:id/upvote  { handle? }
 * One per operator (UNIQUE constraint) → 201 created, 409 already recorded.
 */
import { verifiedHandle } from '@/auth';
import { isUniqueViolation } from '@/lib/db';
import { insertUpvote } from '@/lib/db/queries';
import { cleanHandle, isUuid, jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, 'Invalid id.');
  const body = await readJson(req);
  const handle = (await verifiedHandle()) ?? cleanHandle(body?.handle);
  if (!handle) return jsonError(400, 'A handle is required.');
  try {
    await insertUpvote(id, handle);
    return Response.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return jsonError(409, 'Already recorded under that handle.');
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
