/** POST /api/crops/:id/like → { likes }. One like per IP per circle (best effort). */
import { likeCrop } from '@/lib/db/queries';
import { jsonError } from '@/lib/apiHelpers';

export const runtime = 'nodejs';

const seen = new Set<string>();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const key = `${ip}:${id}`;
  if (seen.has(key)) return jsonError(409, 'Already liked.');
  seen.add(key);
  if (seen.size > 50_000) seen.clear();
  const likes = await likeCrop(id).catch(() => null);
  if (likes === null) return jsonError(404, 'Not found.');
  return Response.json({ likes });
}
