/** GET /api/cards/opponent?power=N → a real pilot's defence team near your power, or a training bot. */
import { verifiedOperatorId } from '@/auth';
import { findOpponent } from '@/lib/db/queries';
import { CARDS, rng } from '@/lib/cards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const power = Number(new URL(req.url).searchParams.get('power')) || 600;
  const userId = (await verifiedOperatorId()) ?? 'guest';
  const real = await findOpponent(userId, power).catch(() => null);
  if (real) return Response.json({ ...real, bot: false, seed: Math.floor(Math.random() * 1e9) });
  // Training bot scaled to your power.
  const r = rng(Date.now());
  const pool = CARDS.filter((c) => c.rarity !== 'U');
  const level = Math.max(1, Math.min(40, Math.round(power / 120)));
  const team = Array.from({ length: 3 }, () => ({ id: pool[Math.floor(r() * pool.length)].id, o: { shards: 0, level } }));
  return Response.json({ handle: 'Training Drone', team, rating: 1000, bot: true, seed: Math.floor(r() * 1e9) });
}
