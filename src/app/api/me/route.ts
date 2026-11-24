/** GET /api/me — the signed-in operator profile (or null) + whether auth is available. */
import { authConfigured, verifiedOperatorId } from '@/auth';
import { getProfile } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const id = await verifiedOperatorId();
  const profile = id ? await getProfile(id) : null;
  return Response.json({ authAvailable: authConfigured, profile });
}
