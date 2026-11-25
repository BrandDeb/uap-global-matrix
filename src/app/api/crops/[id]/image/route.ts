/** GET /api/crops/:id/image, the crop circle JPEG (immutable, long cache). */
import { getCropImage } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const img = await getCropImage(id).catch(() => null);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(img), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' },
  });
}
