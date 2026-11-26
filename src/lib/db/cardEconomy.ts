/**
 * src/lib/db/cardEconomy.ts
 * ---------------------------------------------------------------------------
 * Server-authoritative card economy. Every roll, grant, training step, trade
 * and battle happens here inside a transaction, so collections can't be
 * edited from the browser. Copies of a card = shards + 1.
 * ---------------------------------------------------------------------------
 */
import 'server-only';
import { randomInt } from 'node:crypto';
import { getDb } from './index';
import { battle, CARD_BY_ID, levelCap, makeFighters, powerOf, starsFor, summon, type Owned } from '@/lib/cards';

import type { Sql, TransactionSql } from 'postgres';
type Tx = TransactionSql;

/** Crypto-grade RNG for anything that affects value. */
const secureRand = () => randomInt(0, 2 ** 32) / 2 ** 32;

export interface Wallet {
  signals: number;
  energy: number;
  pity: number;
  pulls: number;
  wins: number;
  losses: number;
  last_daily: string | null;
  scan_day: string | null;
  scans: number;
  encounter: string | null;
  quiz_day: string | null;
  quiz_count: number;
  team: string[];
}

async function wallet(tx: Tx, userId: string): Promise<Wallet> {
  await tx`INSERT INTO card_wallets (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`;
  const [w] = await tx`SELECT * FROM card_wallets WHERE user_id = ${userId} FOR UPDATE`;
  return { ...(w as unknown as Wallet), last_daily: w.last_daily ? String(w.last_daily) : null, scan_day: w.scan_day ? String(w.scan_day) : null, quiz_day: w.quiz_day ? String(w.quiz_day) : null };
}

async function owned(tx: Tx | Sql, userId: string): Promise<Record<string, Owned>> {
  const rows = await tx`SELECT card_id, shards, level FROM card_owned WHERE user_id = ${userId}`;
  return Object.fromEntries(rows.map((r) => [String(r.card_id), { shards: Number(r.shards), level: Number(r.level) }]));
}

async function giveCard(tx: Tx, userId: string, cardId: string) {
  const [r] = await tx`
    INSERT INTO card_owned (user_id, card_id) VALUES (${userId}, ${cardId})
    ON CONFLICT (user_id, card_id) DO UPDATE SET shards = card_owned.shards + 1
    RETURNING shards, (xmax = 0) AS inserted`;
  const shards = Number(r.shards);
  return { id: cardId, isNew: Boolean(r.inserted), stars: starsFor(shards), starUp: !r.inserted && starsFor(shards) > starsFor(shards - 1) };
}

const today = () => new Date().toISOString().slice(0, 10);

export async function state(userId: string) {
  const sql = getDb();
  return sql.begin(async (tx) => ({ wallet: await wallet(tx, userId), owned: await owned(tx, userId) }));
}

export async function claimDaily(userId: string) {
  return getDb().begin(async (tx) => {
    const w = await wallet(tx, userId);
    if (w.last_daily === today()) return { claimed: false };
    await tx`UPDATE card_wallets SET last_daily = ${today()}, signals = signals + 1, energy = energy + 5 WHERE user_id = ${userId}`;
    return { claimed: true };
  });
}

export async function doSummon(userId: string, n: 1 | 10) {
  return getDb().begin(async (tx) => {
    const w = await wallet(tx, userId);
    if (w.signals < n) return { error: 'Not enough signals.' as const };
    let pity = w.pity;
    const results = [];
    for (let i = 0; i < n; i++) {
      const def = summon(secureRand, pity);
      pity = def.rarity === 'L' || def.rarity === 'U' || def.rarity === 'M' ? 0 : pity + 1;
      results.push(await giveCard(tx, userId, def.id));
    }
    await tx`UPDATE card_wallets SET signals = signals - ${n}, pulls = pulls + ${n}, pity = ${pity} WHERE user_id = ${userId}`;
    return { results };
  });
}

export async function trainCard(userId: string, cardId: string, levels: number) {
  return getDb().begin(async (tx) => {
    const w = await wallet(tx, userId);
    const [o] = await tx`SELECT shards, level FROM card_owned WHERE user_id = ${userId} AND card_id = ${cardId} FOR UPDATE`;
    if (!o) return { trained: 0 };
    const cap = levelCap(starsFor(Number(o.shards)));
    const n = Math.max(0, Math.min(levels, w.energy, cap - Number(o.level)));
    if (n) {
      await tx`UPDATE card_owned SET level = level + ${n} WHERE user_id = ${userId} AND card_id = ${cardId}`;
      await tx`UPDATE card_wallets SET energy = energy - ${n} WHERE user_id = ${userId}`;
    }
    return { trained: n };
  });
}

export async function setTeam(userId: string, handle: string, team: string[]) {
  return getDb().begin(async (tx) => {
    await wallet(tx, userId);
    const mine = await owned(tx, userId);
    const t = [...new Set(team)].filter((id) => mine[id] && CARD_BY_ID[id]).slice(0, 3);
    await tx`UPDATE card_wallets SET team = ${t} WHERE user_id = ${userId}`;
    if (t.length === 3) {
      const snapshot = t.map((id) => ({ id, o: mine[id] }));
      const power = snapshot.reduce((s, x) => s + powerOf(CARD_BY_ID[x.id], x.o), 0);
      await tx`
        INSERT INTO card_teams (user_id, handle, team, power) VALUES (${userId}, ${handle}, ${tx.json(snapshot as never)}, ${power})
        ON CONFLICT (user_id) DO UPDATE SET handle = ${handle}, team = ${tx.json(snapshot as never)}, power = ${power}, updated_at = now()`;
    }
    return { team: t };
  });
}

/** Server-simulated ranked battle: picks an opponent, fights, records. */
export async function rankedBattle(userId: string, handle: string) {
  const sql = getDb();
  const { wallet: w, owned: mine } = await state(userId);
  const team = w.team.filter((id) => mine[id]);
  if (team.length !== 3) return { error: 'Pick a team of 3 first.' as const };
  await setTeam(userId, handle, team);
  const mineTeam = team.map((id) => ({ id, o: mine[id] }));
  const power = mineTeam.reduce((s, x) => s + powerOf(CARD_BY_ID[x.id], x.o), 0);
  const [opp] = await sql`
    SELECT handle, team, rating FROM card_teams WHERE user_id <> ${userId}
    ORDER BY abs(power - ${power}) + random() * 400 LIMIT 1`;
  let oppTeam: { id: string; o: Owned }[];
  let oppHandle: string;
  let bot = false;
  if (opp) {
    oppTeam = opp.team as { id: string; o: Owned }[];
    oppHandle = String(opp.handle);
  } else {
    bot = true;
    oppHandle = 'Training Drone';
    const pool = Object.values(CARD_BY_ID).filter((c) => c.rarity === 'C' || c.rarity === 'R');
    const level = Math.max(1, Math.min(40, Math.round(power / 120)));
    oppTeam = Array.from({ length: 3 }, () => ({ id: pool[randomInt(0, pool.length)].id, o: { shards: 0, level } }));
  }
  const seed = randomInt(0, 2 ** 31);
  const res = battle(makeFighters(mineTeam, 0), makeFighters(oppTeam, 1), seed);
  const won = res.winner === 0;
  const [wallet2] = await sql`
    UPDATE card_wallets SET
      wins = wins + ${won ? 1 : 0}, losses = losses + ${won ? 0 : 1},
      energy = energy + ${won ? 3 : 1},
      signals = signals + ${won ? 1 : 0} * (CASE WHEN (wins + 1) % 3 = 0 THEN 1 ELSE 0 END)
    WHERE user_id = ${userId} RETURNING wins, losses`;
  let rating: number | null = null;
  if (!bot) {
    const [r] = await sql`UPDATE card_teams SET rating = greatest(0, rating + ${won ? 15 : -10}) WHERE user_id = ${userId} RETURNING rating`;
    rating = r ? Number(r.rating) : null;
  }
  return { mine: mineTeam, opponent: { handle: oppHandle, team: oppTeam, bot }, seed, won, rating, record: wallet2 };
}

/* --- Xeno Keeper -------------------------------------------------------------- */

export async function keeperScan(userId: string) {
  return getDb().begin(async (tx) => {
    const w = await wallet(tx, userId);
    const scans = w.scan_day === today() ? w.scans : 0;
    if (scans >= 3) return { error: 'Scanners recharging. New site at midnight UTC.' as const };
    const def = summon(secureRand, 0);
    await tx`UPDATE card_wallets SET scan_day = ${today()}, scans = ${scans + 1}, encounter = ${def.id} WHERE user_id = ${userId}`;
    return { encounter: def.id, scansLeft: 2 - scans };
  });
}

/** Resolve the pending encounter. Catch success is decided by the client's timing game. */
export async function keeperCatch(userId: string, caught: boolean) {
  return getDb().begin(async (tx) => {
    const w = await wallet(tx, userId);
    if (!w.encounter) return { error: 'No survivor to catch.' as const };
    await tx`UPDATE card_wallets SET encounter = NULL WHERE user_id = ${userId}`;
    if (!caught) return { caught: false, id: w.encounter };
    return { caught: true, ...(await giveCard(tx, userId, w.encounter)) };
  });
}

/** Correct quiz answers grant energy (max 10 per day). */
export async function quizReward(userId: string) {
  return getDb().begin(async (tx) => {
    const w = await wallet(tx, userId);
    const count = w.quiz_day === today() ? w.quiz_count : 0;
    if (count >= 10) return { granted: 0 };
    await tx`UPDATE card_wallets SET quiz_day = ${today()}, quiz_count = ${count + 1}, energy = energy + 1 WHERE user_id = ${userId}`;
    return { granted: 1 };
  });
}

export async function grantSignal(userId: string) {
  const sql = getDb();
  await sql`INSERT INTO card_wallets (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`;
  await sql`UPDATE card_wallets SET signals = signals + 1 WHERE user_id = ${userId}`;
}

/* --- trading --------------------------------------------------------------------- */

export async function createTrade(from: { id: string; handle: string }, toHandle: string, give: string, want: string) {
  const sql = getDb();
  if (!CARD_BY_ID[give] || !CARD_BY_ID[want]) return { error: 'Unknown card.' as const };
  const [to] = await sql`SELECT id, operator_handle FROM profiles WHERE lower(operator_handle) = lower(${toHandle})`;
  if (!to) return { error: 'No pilot with that handle.' as const };
  if (String(to.id) === from.id) return { error: 'You can’t trade with yourself.' as const };
  const [have] = await sql`SELECT 1 FROM card_owned WHERE user_id = ${from.id} AND card_id = ${give}`;
  if (!have) return { error: 'You don’t own that card.' as const };
  const [open] = await sql`SELECT count(*)::int AS n FROM card_trades WHERE from_user = ${from.id} AND status = 'open'`;
  if (Number(open.n) >= 10) return { error: 'You have 10 open offers already.' as const };
  const [t] = await sql`
    INSERT INTO card_trades (from_user, from_handle, to_user, to_handle, give_card, want_card)
    VALUES (${from.id}, ${from.handle}, ${String(to.id)}, ${String(to.operator_handle)}, ${give}, ${want}) RETURNING id::int`;
  return { id: Number(t.id) };
}

export async function listTrades(userId: string) {
  return getDb()`
    SELECT id::int, from_handle, to_handle, give_card, want_card, status, created_at, (from_user = ${userId}) AS mine
    FROM card_trades WHERE (from_user = ${userId} OR to_user = ${userId}) AND (status = 'open' OR created_at > now() - interval '3 days')
    ORDER BY created_at DESC LIMIT 50`;
}

/** Remove one copy of a card (shards-1, or delete when it was the last copy). */
async function takeCard(tx: Tx, userId: string, cardId: string): Promise<boolean> {
  const [o] = await tx`SELECT shards FROM card_owned WHERE user_id = ${userId} AND card_id = ${cardId} FOR UPDATE`;
  if (!o) return false;
  if (Number(o.shards) > 0) await tx`UPDATE card_owned SET shards = shards - 1 WHERE user_id = ${userId} AND card_id = ${cardId}`;
  else await tx`DELETE FROM card_owned WHERE user_id = ${userId} AND card_id = ${cardId}`;
  await tx`UPDATE card_wallets SET team = array_remove(team, ${cardId}) WHERE user_id = ${userId} AND NOT EXISTS (SELECT 1 FROM card_owned WHERE user_id = ${userId} AND card_id = ${cardId})`;
  return true;
}

export async function respondTrade(userId: string, id: number, action: 'accept' | 'decline' | 'cancel') {
  return getDb().begin(async (tx) => {
    const [t] = await tx`SELECT * FROM card_trades WHERE id = ${id} AND status = 'open' FOR UPDATE`;
    if (!t) return { error: 'Offer no longer open.' as const };
    if (action === 'cancel') {
      if (String(t.from_user) !== userId) return { error: 'Not your offer.' as const };
      await tx`UPDATE card_trades SET status = 'cancelled' WHERE id = ${id}`;
      return { status: 'cancelled' };
    }
    if (String(t.to_user) !== userId) return { error: 'Not your offer.' as const };
    if (action === 'decline') {
      await tx`UPDATE card_trades SET status = 'declined' WHERE id = ${id}`;
      return { status: 'declined' };
    }
    const from = String(t.from_user);
    const give = String(t.give_card);
    const want = String(t.want_card);
    if (!(await takeCard(tx, from, give))) {
      await tx`UPDATE card_trades SET status = 'cancelled' WHERE id = ${id}`;
      return { error: 'They no longer have that card.' as const };
    }
    if (!(await takeCard(tx, userId, want))) throw new Error('You don’t have the card they want.');
    await wallet(tx, from);
    await giveCard(tx, userId, give);
    await giveCard(tx, from, want);
    await tx`UPDATE card_trades SET status = 'accepted' WHERE id = ${id}`;
    return { status: 'accepted' };
  });
}
