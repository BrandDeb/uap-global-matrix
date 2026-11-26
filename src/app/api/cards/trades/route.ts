/**
 * /api/cards/trades
 *   GET → your open and recent offers (sent and received)
 *   POST { to, give, want } → offer one of your cards for one of theirs
 *   PATCH { id, action: accept | decline | cancel }
 */
import { verifiedHandle, verifiedOperatorId } from '@/auth';
import { createTrade, listTrades, respondTrade } from '@/lib/db/cardEconomy';
import { jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const id = await verifiedOperatorId();
  if (!id) return jsonError(401, 'Sign in to trade.');
  return Response.json({ trades: await listTrades(id) });
}

export async function POST(req: Request): Promise<Response> {
  const [id, handle] = await Promise.all([verifiedOperatorId(), verifiedHandle()]);
  if (!id || !handle) return jsonError(401, 'Sign in to trade.');
  const b = (await readJson(req)) ?? {};
  const r = await createTrade({ id, handle }, String(b.to ?? '').replace(/^@/, ''), String(b.give ?? ''), String(b.want ?? ''));
  return 'error' in r ? jsonError(400, String(r.error)) : Response.json(r, { status: 201 });
}

export async function PATCH(req: Request): Promise<Response> {
  const id = await verifiedOperatorId();
  if (!id) return jsonError(401, 'Sign in to trade.');
  const b = (await readJson(req)) ?? {};
  const action = b.action === 'accept' || b.action === 'decline' || b.action === 'cancel' ? b.action : null;
  if (!action) return jsonError(400, 'Unknown action.');
  try {
    const r = await respondTrade(id, Number(b.id), action);
    return 'error' in r ? jsonError(400, String(r.error)) : Response.json(r);
  } catch (err: unknown) {
    return jsonError(400, err instanceof Error ? err.message : 'Trade failed.');
  }
}
