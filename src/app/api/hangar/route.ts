/**
 * /api/hangar, server-authoritative Hangar + Tarkov-style raids (signed in).
 *   GET  → { hangar, owned }
 *   POST { action } : equip {slot,id} · color {color} · secure {id|null}
 *     · buy {id} · launch {insure} · resolve {extracted,wave} · abort
 */
import { verifiedOperatorId } from '@/auth';
import { abortRaid, buyPart, equip, launchRaid, resolveRaid, setColor, setSecure, state } from '@/lib/db/hangarEconomy';
import { hasDb } from '@/lib/db';
import { clientIp, jsonError, limited, readJson } from '@/lib/apiHelpers';
import type { Slot } from '@/lib/craft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const id = await verifiedOperatorId();
  if (!id) return jsonError(401, 'Sign in to open your Hangar.');
  if (!hasDb()) return jsonError(503, 'The Hangar needs the database.');
  return Response.json(await state(id));
}

export async function POST(req: Request): Promise<Response> {
  const id = await verifiedOperatorId();
  if (!id) return jsonError(401, 'Sign in to open your Hangar.');
  if (!hasDb()) return jsonError(503, 'The Hangar needs the database.');
  if (limited(`hangar:${id}`, 20, 10_000)) return jsonError(429, 'Slow down a little.');
  void clientIp;
  const b = (await readJson(req)) ?? {};
  try {
    let r: { error?: string } & Record<string, unknown>;
    switch (b.action) {
      case 'equip':
        r = await equip(id, String(b.slot) as Slot, String(b.id ?? ''));
        break;
      case 'color':
        r = await setColor(id, String(b.color ?? ''));
        break;
      case 'secure':
        r = await setSecure(id, b.id == null ? null : String(b.id));
        break;
      case 'buy':
        r = await buyPart(id, String(b.id ?? ''));
        break;
      case 'launch':
        r = await launchRaid(id, Boolean(b.insure));
        break;
      case 'resolve':
        r = await resolveRaid(id, Boolean(b.extracted), Number(b.wave) || 0);
        break;
      case 'abort':
        r = await abortRaid(id);
        break;
      default:
        return jsonError(400, 'Unknown action.');
    }
    return r.error ? jsonError(400, String(r.error)) : Response.json(r);
  } catch (err: unknown) {
    return jsonError(502, err instanceof Error ? err.message : 'Hangar error.');
  }
}
