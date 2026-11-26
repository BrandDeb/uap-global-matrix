/** POST /api/cards/team { team: [{id, o:{shards, level}}] } → saves your PvP defence team. GET → top teams. */
import { verifiedHandle, verifiedOperatorId } from '@/auth';
import { saveTeam, topTeams } from '@/lib/db/queries';
import { jsonError, readJson } from '@/lib/apiHelpers';
import { CARD_BY_ID, levelCap, powerOf, starsFor } from '@/lib/cards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json({ top: await topTeams().catch(() => []) });
}

export async function POST(req: Request): Promise<Response> {
  const [userId, handle] = await Promise.all([verifiedOperatorId(), verifiedHandle()]);
  if (!userId || !handle) return jsonError(401, 'Sign in to enter the arena.');
  const body = await readJson(req);
  const raw = Array.isArray(body?.team) ? (body.team as { id?: unknown; o?: { shards?: unknown; level?: unknown } }[]) : [];
  const team = raw
    .slice(0, 3)
    .filter((t) => typeof t.id === 'string' && CARD_BY_ID[t.id])
    .map((t) => {
      const shards = Math.max(0, Math.min(200, Math.floor(Number(t.o?.shards) || 0)));
      const level = Math.max(1, Math.min(levelCap(starsFor(shards)), Math.floor(Number(t.o?.level) || 1)));
      return { id: t.id as string, o: { shards, level } };
    });
  if (team.length !== 3) return jsonError(400, 'Pick exactly 3 cards.');
  const power = team.reduce((s, t) => s + powerOf(CARD_BY_ID[t.id], t.o), 0);
  await saveTeam({ userId, handle, team, power });
  return Response.json({ ok: true, power });
}
