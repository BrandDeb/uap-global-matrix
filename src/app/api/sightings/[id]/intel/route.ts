/**
 * /api/sightings/:id/intel, operator discussion thread.
 *   GET  ?since=<iso>   rows (all, or only newer, for polling)
 *   POST { text, parentId?, handle? }
 * A signed-in operator always posts under their verified GitHub handle; the
 * client-supplied `handle` is only used for anonymous posts.
 */
import { verifiedHandle, verifiedOperatorId } from '@/auth';
import { insertThread, listThreads } from '@/lib/db/queries';
import { isUuid, isoOrNull, jsonError, readJson } from '@/lib/apiHelpers';
import { limited } from '@/lib/apiHelpers';
import { BAN_NOW, moderate } from '@/lib/moderation';
import { standing, strike } from '@/lib/db/queries';

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
  const [userId, handle] = await Promise.all([verifiedOperatorId(), verifiedHandle()]);
  if (!userId || !handle) return jsonError(401, 'Sign in to join the discussion.');
  if ((await standing(userId)).banned) return jsonError(403, 'Your account is suspended.');
  if (limited(`intel:${userId}`, 1, 10_000) || limited(`intel-day:${userId}`, 60, 86_400_000)) return jsonError(429, 'Slow down a little.');
  const { verdict } = await moderate(text);
  if (verdict !== 'ok') {
    const st = await strike(userId, verdict, BAN_NOW.includes(verdict));
    return jsonError(st.banned ? 403 : 422, st.banned ? 'That broke the rules. Your account has been suspended.' : `Comment blocked (${verdict}). Warning ${st.strikes} of 3.`);
  }
  try {
    const row = await insertThread({ sightingId: id, parentId, handle, text });
    return Response.json(row, { status: 201 });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
