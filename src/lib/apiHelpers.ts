/**
 * src/lib/apiHelpers.ts, small boundary helpers shared by the API routes.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** Normalize a client-supplied anonymous handle: 2..40 chars of [A-Za-z0-9_-]. */
export function cleanHandle(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const h = v.trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  return h.length >= 2 ? h : null;
}

export function isoOrNull(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
