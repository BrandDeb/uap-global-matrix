/**
 * /api/crops, the public crop circle gallery.
 *   GET  ?sort=top|new → [{ id, handle, field, likes, created_at }]
 *   POST { image (JPEG data URL), handle, field } → { id }
 */
import { randomBytes } from 'node:crypto';
import { verifiedHandle, verifiedOperatorId } from '@/auth';
import { BAN_NOW, moderateImage } from '@/lib/moderation';
import { standing, strike } from '@/lib/db/queries';
import { insertCrop, listCrops } from '@/lib/db/queries';
import { jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIELDS = ['wheat', 'snow', 'desert', 'beach', 'moon', 'mars'];
const hits = new Map<string, number[]>();

export async function GET(req: Request): Promise<Response> {
  const sort = new URL(req.url).searchParams.get('sort') === 'new' ? 'new' : 'top';
  try {
    return Response.json(await listCrops(sort));
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}

export async function POST(req: Request): Promise<Response> {
  const [userId, signedHandle] = await Promise.all([verifiedOperatorId(), verifiedHandle()]);
  if (!userId || !signedHandle) return jsonError(401, 'Sign in to publish to the gallery.');
  if ((await standing(userId)).banned) return jsonError(403, 'Your account is suspended.');
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 5) return jsonError(429, 'The field needs a rest. Try again in a few minutes.');
  hits.set(ip, [...recent, now]);

  const body = await readJson(req);
  const image = typeof body?.image === 'string' ? body.image : '';
  const m = image.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return jsonError(400, 'Expected a JPEG image.');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > 450_000) return jsonError(413, 'Image too large.');
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return jsonError(400, 'Not a JPEG.');
  const field = typeof body?.field === 'string' && FIELDS.includes(body.field) ? body.field : 'wheat';
  const handle = signedHandle;
  // Every image is AI-screened before publishing; anything indecent bans the account.
  const verdict = await moderateImage(buf, 'image/jpeg');
  if (!verdict.ok) {
    if (verdict.label === 'unavailable') return jsonError(503, 'Image check is busy. Try again in a minute.');
    if (BAN_NOW.includes(verdict.label as never) || verdict.label === 'violent') {
      await strike(userId, `image:${verdict.label}`, true);
      return jsonError(403, 'That image broke the rules. Your account has been suspended.');
    }
    await strike(userId, `image:${verdict.label}`);
    return jsonError(422, 'Only crop circle drawings can be published (no text, links or photos).');
  }
  const id = randomBytes(6).toString('base64url');
  try {
    await insertCrop({ id, handle, field, image: buf });
    return Response.json({ id }, { status: 201 });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
