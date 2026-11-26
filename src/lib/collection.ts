'use client';

/**
 * src/lib/collection.ts, the player's card collection (localStorage
 * "uap-cards", synced to the account by ProfileSync).
 *   signals → summons, energy → training, team → PvP defence.
 */
import { useSyncExternalStore } from 'react';
import { CARD_BY_ID, levelCap, rng, starsFor, summon, type CardDef, type Owned } from './cards';

export interface Collection {
  savedAt: number;
  owned: Record<string, Owned>;
  signals: number;
  energy: number;
  pity: number;
  lastDaily: string;
  team: string[];
  pulls: number;
  wins: number;
  losses: number;
}
const KEY = 'uap-cards';
const EVENT = 'uap-cards-change';
const START: Collection = { savedAt: 0, owned: {}, signals: 10, energy: 10, pity: 0, lastDaily: '', team: [], pulls: 0, wins: 0, losses: 0 };

let raw: string | null = null;
let cache: Collection = START;
function read(): Collection {
  if (typeof window === 'undefined') return START;
  let r: string | null = null;
  try {
    r = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  if (r === raw) return cache;
  raw = r;
  try {
    cache = { ...START, ...(r ? (JSON.parse(r) as Partial<Collection>) : {}) };
  } catch {
    cache = START;
  }
  return cache;
}
function write(c: Collection) {
  const next = { ...c, savedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cache = next;
  }
  window.dispatchEvent(new Event(EVENT));
  window.dispatchEvent(new Event('uap-sync-change'));
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener(`${KEY}-change`, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener(`${KEY}-change`, cb);
    window.removeEventListener('storage', cb);
  };
};
export const useCollection = () => useSyncExternalStore(subscribe, read, () => START);
export const getCollection = read;

/** Daily login reward: +1 signal, +5 energy (UTC day). */
export function claimDaily(): boolean {
  const c = read();
  const today = new Date().toISOString().slice(0, 10);
  if (c.lastDaily === today) return false;
  write({ ...c, lastDaily: today, signals: c.signals + 1, energy: c.energy + 5 });
  return true;
}

export function grant(p: { signals?: number; energy?: number }) {
  const c = read();
  write({ ...c, signals: c.signals + (p.signals ?? 0), energy: c.energy + (p.energy ?? 0) });
}

/** Add a specific card (from Xeno Keeper catches, rewards). */
export function addCard(id: string): { def: CardDef; isNew: boolean; starUp: boolean; stars: number } {
  const c = read();
  const def = CARD_BY_ID[id];
  const prev = c.owned[id];
  const shards = prev ? prev.shards + 1 : 0;
  const stars = starsFor(shards);
  write({ ...c, owned: { ...c.owned, [id]: { shards, level: prev?.level ?? 1 } } });
  return { def, isNew: !prev, starUp: !!prev && stars > starsFor(prev.shards), stars };
}

/** Spend signals on summons (1 or 10). Returns results in order. */
export function doSummon(n: 1 | 10) {
  const c = read();
  if (c.signals < n) return null;
  const rand = rng(Date.now() ^ Math.floor(Math.random() * 1e9));
  let pity = c.pity;
  const results: ReturnType<typeof addCard>[] = [];
  write({ ...c, signals: c.signals - n, pulls: c.pulls + n });
  for (let i = 0; i < n; i++) {
    const def = summon(rand, pity);
    pity = def.rarity === 'L' || def.rarity === 'U' ? 0 : pity + 1;
    results.push(addCard(def.id));
  }
  write({ ...read(), pity });
  return results;
}

/** Train a card: 1 energy per level, up to the star-based cap. */
export function train(id: string, levels = 1): number {
  const c = read();
  const o = c.owned[id];
  if (!o) return 0;
  const cap = levelCap(starsFor(o.shards));
  const n = Math.max(0, Math.min(levels, c.energy, cap - o.level));
  if (n) write({ ...c, energy: c.energy - n, owned: { ...c.owned, [id]: { ...o, level: o.level + n } } });
  return n;
}

export function setTeam(team: string[]) {
  write({ ...read(), team: team.slice(0, 3) });
}

export function recordBattle(won: boolean) {
  const c = read();
  write({ ...c, wins: c.wins + (won ? 1 : 0), losses: c.losses + (won ? 0 : 1), energy: c.energy + (won ? 3 : 1), signals: c.signals + (won && (c.wins + 1) % 3 === 0 ? 1 : 0) });
}
