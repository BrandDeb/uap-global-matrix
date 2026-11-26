/**
 * src/lib/db/hangarEconomy.ts
 * ---------------------------------------------------------------------------
 * Server-authoritative Hangar: the parts stash, the equipped craft, and the
 * Tarkov-style raid lifecycle. Launching locks your equipped loadout and
 * (optionally, for scrap) insures it. Extraction banks the loot the SERVER
 * rolls for the wave you reached. Dying loses the raid loot and your equipped
 * non-stock parts — unless insured (chance to return) or held in the secure
 * slot. Stock/starter parts and unequipped stash parts are never lost. All
 * mutations run inside a transaction so a browser can't fake its inventory.
 * ---------------------------------------------------------------------------
 */
import 'server-only';
import { randomInt } from 'node:crypto';
import type { TransactionSql } from 'postgres';
import { getDb } from './index';
import { INSURE_COST, INSURE_RETURN_CHANCE, isStock, PART_BY_ID, raidScrap, rollRaidLoot, STARTER_PARTS, type Slot } from '@/lib/craft';

type Tx = TransactionSql;
const SLOTS: Slot[] = ['frame', 'thrusters', 'wings', 'weapon'];

export interface HangarRow {
  color: string;
  frame: string;
  thrusters: string;
  wings: string;
  weapon: string;
  secure: string | null;
  scrap: number;
  scrap_earned: number;
  best_wave: number;
  raid: { seed: number; startedAt: number; insured: boolean; loadout: Record<Slot, string> } | null;
}

async function row(tx: Tx, userId: string): Promise<HangarRow> {
  await tx`INSERT INTO hangar (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`;
  const [r] = await tx`SELECT * FROM hangar WHERE user_id = ${userId} FOR UPDATE`;
  return r as unknown as HangarRow;
}

async function parts(tx: Tx | ReturnType<typeof getDb>, userId: string): Promise<Record<string, number>> {
  const rows = await tx`SELECT part_id, qty FROM hangar_parts WHERE user_id = ${userId}`;
  const owned: Record<string, number> = {};
  for (const id of STARTER_PARTS) owned[id] = Infinity; // stock, always available
  for (const r of rows) owned[String(r.part_id)] = (owned[String(r.part_id)] ?? 0) + Number(r.qty);
  return owned;
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

export async function equip(userId: string, slot: Slot, id: string) {
  if (!SLOTS.includes(slot) || PART_BY_ID[id]?.slot !== slot) return { error: 'Bad part.' as const };
  return getDb().begin(async (tx) => {
    const h = await row(tx, userId);
    if (h.raid) return { error: 'Finish your raid first.' as const };
    const owned = await parts(tx, userId);
    if (!owned[id]) return { error: 'You don’t own that part.' as const };
    await tx`UPDATE hangar SET ${tx(slot)} = ${id} WHERE user_id = ${userId}`;
    return { ok: true };
  });
}

export async function setColor(userId: string, color: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: 'Bad colour.' as const };
  await getDb()`UPDATE hangar SET color = ${color} WHERE user_id = ${userId}`;
  return { ok: true };
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

/** Launch a raid: lock the equipped loadout, optionally insure it (scrap). */
export async function launchRaid(userId: string, insure: boolean) {
  return getDb().begin(async (tx) => {
    const h = await row(tx, userId);
    if (h.raid) return { error: 'Already in a raid.' as const };
    const loadout = { frame: h.frame, thrusters: h.thrusters, wings: h.wings, weapon: h.weapon };
    let insured = false;
    if (insure) {
      const cost = SLOTS.reduce((s, sl) => {
        const id = loadout[sl];
        return isStock(id) ? s : s + INSURE_COST[PART_BY_ID[id].rarity];
      }, 0);
      if (cost > 0) {
        if (h.scrap < cost) return { error: `Insurance costs ${cost} scrap.` as const };
        await tx`UPDATE hangar SET scrap = scrap - ${cost} WHERE user_id = ${userId}`;
        insured = true;
      }
    }
    const seed = randomInt(0, 2 ** 31);
    await tx`UPDATE hangar SET raid = ${tx.json({ seed, startedAt: Date.now(), insured, loadout } as never)} WHERE user_id = ${userId}`;
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
    const loadout = h.raid.loadout;
    let lostParts: string[] = [];
    let keptParts: string[] = [];
    let loot: string[] = [];
    let scrap = 0;

    if (extracted) {
      loot = rollRaidLoot(h.raid.seed, wave);
      for (const id of loot) await addPart(tx, userId, id);
      scrap = raidScrap(wave);
      await tx`UPDATE hangar SET scrap = scrap + ${scrap}, scrap_earned = scrap_earned + ${scrap}, best_wave = greatest(best_wave, ${wave}), raid = NULL WHERE user_id = ${userId}`;
    } else {
      // Death: lose equipped non-stock parts (unless insured-roll or the secure one).
      for (const sl of SLOTS) {
        const id = loadout[sl];
        if (isStock(id) || id === h.secure) {
          keptParts.push(id);
          continue;
        }
        const survives = h.raid.insured && Math.random() < INSURE_RETURN_CHANCE;
        if (survives) keptParts.push(id);
        else {
          const taken = await takePart(tx, userId, id);
          if (taken) {
            lostParts.push(id);
            // if that was the last copy, fall back to the starter for that slot
            const owned = await parts(tx, userId);
            if (!owned[id]) {
              const starter = STARTER_PARTS.find((s) => PART_BY_ID[s].slot === sl)!;
              await tx`UPDATE hangar SET ${tx(sl)} = ${starter} WHERE user_id = ${userId}`;
            }
          }
        }
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
