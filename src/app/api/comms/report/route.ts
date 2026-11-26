/** POST /api/comms/report { id } → three distinct reports hide a message. */
import { verifiedOperatorId } from '@/auth';
import { commsReport } from '@/lib/db/queries';
import { jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  const userId = await verifiedOperatorId();
  if (!userId) return jsonError(401, 'Sign in to report.');
  const body = await readJson(req);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, 'Bad message id.');
  await commsReport(id, userId);
  return Response.json({ ok: true });
}
