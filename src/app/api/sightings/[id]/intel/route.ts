/**
 * /api/sightings/:id/intel, operator discussion thread.
 *   GET  ?since=<iso>   rows (all, or only newer, for polling)
 *   POST { text, parentId?, handle? }
 * A signed-in operator always posts under their verified GitHub handle; the
 * client-supplied `handle` is only used for anonymous posts.
 */
import { verifiedHandle } from '@/auth';
import { insertThread, listThreads } from '@/lib/db/queries';
import { cleanHandle, isUuid, isoOrNull, jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, 'Invalid id.');
  try {
    const since = isoOrNull(new URL(req.url).searchParams.get('since'));
    return Response.json({ rows: await listThreads(id, since), serverTime: new Date().toISOString() });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, 'Invalid id.');
  const body = await readJson(req);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 2000) return jsonError(400, 'Text must be 1–2000 characters.');
  const parentId = body?.parentId == null ? null : body.parentId;
  if (parentId !== null && !isUuid(parentId)) return jsonError(400, 'Invalid parentId.');
  const handle = (await verifiedHandle()) ?? cleanHandle(body?.handle) ?? 'ANON_OPERATOR';
  try {
    const row = await insertThread({ sightingId: id, parentId, handle, text });
    return Response.json(row, { status: 201 });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
