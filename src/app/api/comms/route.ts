/**
 * /api/comms, moderated chat rooms.
 *   GET  ?room=<id>&after=<msgId> → { messages }
 *   POST { room, body } → posts after moderation (signed-in only)
 */
import { verifiedHandle, verifiedOperatorId } from '@/auth';
import { commsInsert, commsList, commsRecentCount, standing, strike } from '@/lib/db/queries';
import { jsonError, readJson } from '@/lib/apiHelpers';
import { BAN_NOW, moderate } from '@/lib/moderation';
import { ROOMS } from '@/lib/comms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const validRoom = (r: string) => ROOMS.some((x) => x.id === r) || /^case:[0-9a-f-]{36}$/.test(r);

export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const room = q.get('room') ?? '';
  if (!validRoom(room)) return jsonError(400, 'Unknown room.');
  try {
    return Response.json({ messages: await commsList(room, Number(q.get('after')) || 0) });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}

export async function POST(req: Request): Promise<Response> {
  const [userId, handle] = await Promise.all([verifiedOperatorId(), verifiedHandle()]);
  if (!userId || !handle) return jsonError(401, 'Sign in to join Comms.');
  const st = await standing(userId);
  if (st.banned) return jsonError(403, 'Your account has been suspended from Comms.');

  const body = await readJson(req);
  const room = typeof body?.room === 'string' ? body.room : '';
  const text = typeof body?.body === 'string' ? body.body.trim().replace(/\s+/g, ' ') : '';
  if (!validRoom(room)) return jsonError(400, 'Unknown room.');
  if (text.length < 2 || text.length > 500) return jsonError(400, 'Messages are 2 to 500 characters.');

  // Rate limits: 1 message / 10 s, 60 / day.
  if ((await commsRecentCount(userId, 10)) > 0) return jsonError(429, 'Slow down a little (one message every 10 seconds).');
  if ((await commsRecentCount(userId, 86_400)) >= 60) return jsonError(429, 'Daily message limit reached. Back tomorrow!');

  const { verdict } = await moderate(text);
  if (verdict !== 'ok') {
    const s = await strike(userId, verdict, BAN_NOW.includes(verdict));
    if (s.banned) return jsonError(403, 'That message broke the rules. Your account has been suspended from Comms.');
    return jsonError(422, `Message blocked (${verdict}). Warning ${s.strikes} of 3: keep it clean and on-topic.`);
  }
  const id = await commsInsert({ room, userId, handle, body: text });
  return Response.json({ id, handle }, { status: 201 });
}
