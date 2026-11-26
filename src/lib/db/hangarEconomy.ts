/**
 * src/lib/db/hangarEconomy.ts
 * ---------------------------------------------------------------------------
 * Server-authoritative Hangar: the parts stash, the player's craft BLUEPRINT
 * (a hull plus freely-placed modules — Spore-style), and the Tarkov-style raid
 * lifecycle. Launching locks the distinct non-stock parts on your craft and
 * (optionally, for scrap) insures them. Extraction banks the loot the SERVER
 * rolls for the wave you reached. Dying loses the raid loot and those placed
 * non-stock parts — unless insured (chance to return) or held in the secure
 * slot. Stock/starter parts and unplaced stash parts are never lost. When the
 * last copy of a part is lost, it is stripped off the saved blueprint. All
 * mutations run inside a transaction so a browser can't fake its inventory.
 * ---------------------------------------------------------------------------
 */
import 'server-only';
import { randomInt } from 'node:crypto';
import type { TransactionSql } from 'postgres';
import { getDb } from './index';
import {
  DEFAULT_BLUEPRINT,
  INSURE_COST,
  INSURE_RETURN_CHANCE,
  isStock,
  PART_BY_ID,
  partsAtRisk,
  raidScrap,
  rollRaidLoot,
  sanitizeBlueprint,
  STARTER_PARTS,
  type Blueprint,
} from '@/lib/craft';

type Tx = TransactionSql;

export interface HangarRow {
  craft: Blueprint;
  secure: string | null;
  scrap: number;
  scrap_earned: number;
  best_wave: number;
  raid: { seed: number; startedAt: number; insured: boolean; atRisk: string[] } | null;
}

async function parts(tx: Tx | ReturnType<typeof getDb>, userId: string): Promise<Record<string, number>> {
  const rows = await tx`SELECT part_id, qty FROM hangar_parts WHERE user_id = ${userId}`;
  const owned: Record<string, number> = {};
  for (const id of STARTER_PARTS) owned[id] = Infinity; // stock, always available
  for (const r of rows) owned[String(r.part_id)] = (owned[String(r.part_id)] ?? 0) + Number(r.qty);
  return owned;
}

async function row(tx: Tx, userId: string): Promise<HangarRow> {
  await tx`INSERT INTO hangar (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`;
  const [r] = await tx`SELECT * FROM hangar WHERE user_id = ${userId} FOR UPDATE`;
  let craft = (r.craft as Blueprint | null) ?? null;
  if (!craft || !craft.hull) {
    craft = DEFAULT_BLUEPRINT;
    await tx`UPDATE hangar SET craft = ${tx.json(craft as never)} WHERE user_id = ${userId}`;
  }
  return {
    craft,
    secure: r.secure ?? null,
    scrap: Number(r.scrap),
    scrap_earned: Number(r.scrap_earned),
    best_wave: Number(r.best_wave),
    raid: (r.raid as HangarRow['raid']) ?? null,
  };
}

async function addPart(tx: Tx, userId: string, id: string, n = 1) {
  if (isStock(id) || !PART_BY_ID[id]) return;
  await tx`
    INSERT INTO hangar_parts (user_id, part_id, qty) VALUES (${userId}, ${id}, ${n})
    ON CONFLICT (user_id, part_id) DO UPDATE SET qty = hangar_parts.qty + ${n}`;
}
async function takePart(tx: Tx, userId: string, id: string): Promise<boolean> {
  if (isStock(id)) return true;
  const [r] = await tx`SELECT qty FROM hangar_parts WHERE user_id = ${userId} AND part_id = ${id} FOR UPDATE`;
  if (!r || Number(r.qty) <= 0) return false;
  if (Number(r.qty) === 1) await tx`DELETE FROM hangar_parts WHERE user_id = ${userId} AND part_id = ${id}`;
  else await tx`UPDATE hangar_parts SET qty = qty - 1 WHERE user_id = ${userId} AND part_id = ${id}`;
  return true;
}

export async function state(userId: string) {
  const sql = getDb();
  return sql.begin(async (tx) => ({ hangar: await row(tx, userId), owned: await parts(tx, userId) }));
}

/** Save the whole blueprint, clamped to what the player owns + the hull budget. */
export async function setCraft(userId: string, bp: Partial<Blueprint> | null) {
  return getDb().begin(async (tx) => {
    const h = await row(tx, userId);
    if (h.raid) return { error: 'Finish your raid first.' as const };
    const owned = await parts(tx, userId);
    const clean = sanitizeBlueprint(bp, owned);
    await tx`UPDATE hangar SET craft = ${tx.json(clean as never)} WHERE user_id = ${userId}`;
    return { ok: true, craft: clean };
  });
}

export async function setSecure(userId: string, id: string | null) {
  return getDb().begin(async (tx) => {
    const owned = await parts(tx, userId);
    if (id && !owned[id]) return { error: 'You don’t own that part.' as const };
    await tx`UPDATE hangar SET secure = ${id} WHERE user_id = ${userId}`;
    return { ok: true };
  });
}

export async function buyPart(userId: string, id: string) {
  const p = PART_BY_ID[id];
  if (!p) return { error: 'Unknown part.' as const };
  const price = { common: 150, rare: 450, epic: 1100, legendary: 3000 }[p.rarity];
  return getDb().begin(async (tx) => {
    const h = await row(tx, userId);
    if (h.scrap < price) return { error: 'Not enough scrap.' as const };
    await tx`UPDATE hangar SET scrap = scrap - ${price} WHERE user_id = ${userId}`;
    await addPart(tx, userId, id);
    return { ok: true, price };
  });
}

/** Launch a raid: lock the placed non-stock parts, optionally insure them. */
export async function launchRaid(userId: string, insure: boolean) {
  return getDb().begin(async (tx) => {
    const h = await row(tx, userId);
    if (h.raid) return { error: 'Already in a raid.' as const };
    const atRisk = partsAtRisk(h.craft);
    let insured = false;
    if (insure) {
      const cost = atRisk.reduce((s, id) => s + (INSURE_COST[PART_BY_ID[id].rarity] ?? 0), 0);
      if (cost > 0) {
        if (h.scrap < cost) return { error: `Insurance costs ${cost} scrap.` as const };
        await tx`UPDATE hangar SET scrap = scrap - ${cost} WHERE user_id = ${userId}`;
        insured = true;
      }
    }
    const seed = randomInt(0, 2 ** 31);
    await tx`UPDATE hangar SET raid = ${tx.json({ seed, startedAt: Date.now(), insured, atRisk } as never)} WHERE user_id = ${userId}`;
    return { ok: true, seed, insured };
  });
}

/** Resolve a raid. extracted=true banks server-rolled loot; false (death) applies loss. */
export async function resolveRaid(userId: string, extracted: boolean, waveRaw: number) {
  return getDb().begin(async (tx) => {
    const h = await row(tx, userId);
    if (!h.raid) return { error: 'No active raid.' as const };
    // Clamp the client-reported wave to bound fakery.
    const wave = Math.max(0, Math.min(Number(waveRaw) || 0, h.best_wave + 4, 60));
    const lostParts: string[] = [];
    const keptParts: string[] = [];
    let loot: string[] = [];
    let scrap = 0;

    if (extracted) {
      loot = rollRaidLoot(h.raid.seed, wave);
      for (const id of loot) await addPart(tx, userId, id);
      scrap = raidScrap(wave);
      await tx`UPDATE hangar SET scrap = scrap + ${scrap}, scrap_earned = scrap_earned + ${scrap}, best_wave = greatest(best_wave, ${wave}), raid = NULL WHERE user_id = ${userId}`;
    } else {
      // Death: lose placed non-stock parts (unless insured-roll or the secure one).
      let dirty = false;
      for (const id of h.raid.atRisk) {
        if (isStock(id) || id === h.secure) {
          keptParts.push(id);
          continue;
        }
        const survives = h.raid.insured && Math.random() < INSURE_RETURN_CHANCE;
        if (survives) {
          keptParts.push(id);
          continue;
        }
        const taken = await takePart(tx, userId, id);
        if (taken) lostParts.push(id);
      }
      // Strip any now-unowned parts off the saved blueprint.
      if (lostParts.length) {
        const owned = await parts(tx, userId);
        const clean = sanitizeBlueprint(h.craft, owned);
        if (clean.modules.length !== h.craft.modules.length || clean.hull !== h.craft.hull) dirty = true;
        if (dirty) await tx`UPDATE hangar SET craft = ${tx.json(clean as never)} WHERE user_id = ${userId}`;
      }
      await tx`UPDATE hangar SET best_wave = greatest(best_wave, ${wave}), raid = NULL WHERE user_id = ${userId}`;
    }
    return { ok: true, extracted, wave, loot, scrap, lostParts, keptParts, insured: h.raid.insured };
  });
}

/** Abandon a stuck raid without reward (e.g. page closed). No loss, no loot. */
export async function abortRaid(userId: string) {
  await getDb()`UPDATE hangar SET raid = NULL WHERE user_id = ${userId}`;
  return { ok: true };
}
