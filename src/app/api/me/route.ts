/**
 * /api/me
 *   GET → the signed-in operator profile (or null), synced prefs, and which
 *         sign-in providers exist.
 *   PUT { prefs } → save synced client state (name, avatar, theme, secrets,
 *         badges, arcade bests) to the account. Signed-in only.
 */
import { enabledProviders, verifiedOperatorId } from '@/auth';
import { getPrefs, getProfile, savePrefs } from '@/lib/db/queries';
import { jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const id = await verifiedOperatorId();
  const [profile, prefs] = id ? await Promise.all([getProfile(id), getPrefs(id)]) : [null, null];
  return Response.json({ providers: enabledProviders, profile, prefs });
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 50) : []);

export async function PUT(req: Request): Promise<Response> {
  const id = await verifiedOperatorId();
  if (!id) return jsonError(401, 'Sign in to sync your profile.');
  const body = (await readJson(req)) as { prefs?: Record<string, unknown> } | null;
  const p = body?.prefs ?? {};
  const bests: Record<string, number> = {};
  if (p.bests && typeof p.bests === 'object') {
    for (const [k, v] of Object.entries(p.bests as Record<string, unknown>).slice(0, 10)) {
      if (typeof v === 'number' && Number.isFinite(v)) bests[k.slice(0, 40)] = Math.max(0, Math.floor(v));
    }
  }
  const clean = {
    name: str(p.name, 40) ?? '',
    avatar: typeof p.avatar === 'number' ? Math.max(0, Math.min(50, Math.floor(p.avatar))) : 0,
    theme: ['light', 'dark', 'system'].includes(p.theme as string) ? p.theme : 'dark',
    onboarded: Boolean(p.onboarded),
    eggs: strList(p.eggs),
    badges: strList(p.badges),
    bests,
    daily: p.daily && typeof p.daily === 'object' ? p.daily : undefined,
  };
  if (JSON.stringify(clean).length > 8000) return jsonError(413, 'Too much data.');
  try {
    await savePrefs(id, clean);
    return Response.json({ ok: true });
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Database error.');
  }
}
