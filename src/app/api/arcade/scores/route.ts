/**
 * /api/arcade/scores, arcade leaderboards (Neon, or in-memory in demo mode).
 *   GET  ?game=<id>            → { weekly: [{handle, score}], allTime: [...] }
 *   POST { game, handle, score } → 201
 * Guards: known games only, integer scores under a per-game ceiling, handle
 * sanitised (signed-in operators always post under their verified handle),
 * and a per-IP rate limit.
 */
import { verifiedHandle } from '@/auth';
import { insertScore, topScores } from '@/lib/db/queries';
import { cleanHandle, jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SCORE: Record<string, number> = { 'moove-it': 400_000, 'junk-invaders': 2_000_000, 'gravity-janitor': 2_000_000 };
const hits = new Map<string, number[]>();

export async function GET(req: Request): Promise<Response> {
  const game = new URL(req.url).searchParams.get('game') ?? '';
  if (!(game in MAX_SCORE)) return jsonError(400, 'Unknown game.');
  try {
    const [weekly, allTime] = await Promise.all([topScores(game, true), topScores(game, false)]);
    return Response.json({ weekly, allTime });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}

export async function POST(req: Request): Promise<Response> {
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 6) return jsonError(429, 'Easy, ace, try again in a minute.');
  hits.set(ip, [...recent, now]);

  const body = await readJson(req);
  const game = typeof body?.game === 'string' ? body.game : '';
  const score = typeof body?.score === 'number' ? Math.floor(body.score) : NaN;
  if (!(game in MAX_SCORE)) return jsonError(400, 'Unknown game.');
  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE[game]) return jsonError(400, 'That score looks out of this world.');
  const handle = (await verifiedHandle()) ?? cleanHandle(body?.handle);
  if (!handle) return jsonError(400, 'Pick a name (2–40 letters, numbers, _ or -).');
  try {
    await insertScore(game, handle, score);
    return Response.json({ ok: true, handle }, { status: 201 });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
