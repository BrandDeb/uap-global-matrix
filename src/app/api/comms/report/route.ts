/** POST /api/comms/report { id } → three distinct reports hide a message. */
import { clientIp, limited } from '@/lib/apiHelpers';
import { verifiedOperatorId } from '@/auth';
import { commsReport } from '@/lib/db/queries';
import { jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  if (limited(`report:${clientIp(req)}`, 20, 600000)) return Response.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  const userId = await verifiedOperatorId();
  if (!userId) return jsonError(401, 'Sign in to report.');
  const body = await readJson(req);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, 'Bad message id.');
  await commsReport(id, userId);
  return Response.json({ ok: true });
}
