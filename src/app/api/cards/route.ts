/**
 * /api/cards, the server-authoritative card economy (signed-in only).
 *   GET  → { wallet, owned }
 *   POST { action } where action is one of:
 *     daily · summon {n:1|10} · train {id, levels} · team {team:[ids]}
 *     battle · scan · catch {caught} · quiz
 */
import { verifiedHandle, verifiedOperatorId } from '@/auth';
import { claimDaily, doSummon, keeperCatch, keeperScan, quizReward, rankedBattle, setTeam, state, trainCard } from '@/lib/db/cardEconomy';
import { hasDb } from '@/lib/db';
import { jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hits = new Map<string, number[]>();

async function who() {
  const [id, handle] = await Promise.all([verifiedOperatorId(), verifiedHandle()]);
  return id && handle ? { id: id as string, handle: handle as string } : null;
}

export async function GET(): Promise<Response> {
  const u = await who();
  if (!u) return jsonError(401, 'Sign in to start collecting.');
  if (!hasDb()) return jsonError(503, 'Cards need the database.');
  return Response.json(await state(u.id));
}

export async function POST(req: Request): Promise<Response> {
  const u = await who();
  if (!u) return jsonError(401, 'Sign in to start collecting.');
  if (!hasDb()) return jsonError(503, 'Cards need the database.');
  const now = Date.now();
  const recent = (hits.get(u.id) ?? []).filter((t) => now - t < 10_000);
  if (recent.length >= 15) return jsonError(429, 'Easy there, pilot.');
  hits.set(u.id, [...recent, now]);

  const body = (await readJson(req)) ?? {};
  try {
    switch (body.action) {
      case 'daily':
        return Response.json(await claimDaily(u.id));
      case 'summon': {
        const r = await doSummon(u.id, body.n === 10 ? 10 : 1);
        return 'error' in r ? jsonError(400, String(r.error)) : Response.json(r);
      }
      case 'train':
        return Response.json(await trainCard(u.id, String(body.id ?? ''), Math.max(1, Math.min(50, Number(body.levels) || 1))));
      case 'team':
        return Response.json(await setTeam(u.id, u.handle, Array.isArray(body.team) ? body.team.map(String) : []));
      case 'battle': {
        const r = await rankedBattle(u.id, u.handle);
        return 'error' in r ? jsonError(400, String(r.error)) : Response.json(r);
      }
      case 'scan': {
        const r = await keeperScan(u.id);
        return 'error' in r ? jsonError(400, String(r.error)) : Response.json(r);
      }
      case 'catch': {
        const r = await keeperCatch(u.id, Boolean(body.caught));
        return 'error' in r ? jsonError(400, String(r.error)) : Response.json(r);
      }
      case 'quiz':
        return Response.json(await quizReward(u.id));
      default:
        return jsonError(400, 'Unknown action.');
    }
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Card server error.');
  }
}
