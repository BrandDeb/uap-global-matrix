/** GET /api/feed, intel feed cards (with thread/upvote counts) + trending strip. */
import { feedItems, trending } from '@/lib/db/queries';
import { jsonError } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const [items, top] = await Promise.all([feedItems(40), trending(8)]);
    return Response.json({ items, trending: top });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
