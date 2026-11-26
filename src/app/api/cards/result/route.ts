/** POST /api/cards/result { won } → arena rating ±. */
import { verifiedOperatorId } from '@/auth';
import { adjustRating } from '@/lib/db/queries';
import { jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
const last = new Map<string, number>();

export async function POST(req: Request): Promise<Response> {
  const userId = await verifiedOperatorId();
  if (!userId) return jsonError(401, 'Sign in for ranked battles.');
  const now = Date.now();
  if (now - (last.get(userId) ?? 0) < 8000) return jsonError(429, 'One ranked result every few seconds.');
  last.set(userId, now);
  const body = await readJson(req);
  const rating = await adjustRating(userId, body?.won ? 15 : -10).catch(() => null);
  return Response.json({ rating });
}
