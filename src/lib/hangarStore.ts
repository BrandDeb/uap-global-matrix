'use client';

/**
 * src/lib/hangarStore.ts, the Hangar save (localStorage "uap-hangar", synced
 * to the account by ProfileSync). Tracks the parts you OWN (found or bought),
 * the craft you've assembled, scrap, lifetime scrap (pilot rank) and best wave.
 */
import { useSyncExternalStore } from 'react';
import { craftLevel, DEFAULT_CRAFT, PART_BY_ID, STARTER_PARTS, type Craft, type Rarity, type Slot } from './craft';

export interface HangarSave {
  savedAt: number;
  craft: Craft;
  owned: string[];
  scrap: number;
  scrapEarned: number;
  bestWave: number;
}
const KEY = 'uap-hangar';
const START: HangarSave = { savedAt: 0, craft: DEFAULT_CRAFT, owned: [...STARTER_PARTS], scrap: 0, scrapEarned: 0, bestWave: 0 };
export const BUY_PRICE: Record<Rarity, number> = { common: 150, rare: 450, epic: 1100, legendary: 3000 };

let raw: string | null = null;
let cache = START;
function read(): HangarSave {
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
    const p = r ? JSON.parse(r) : {};
    cache = { ...START, ...p, craft: { ...DEFAULT_CRAFT, ...(p.craft ?? {}) }, owned: [...new Set([...STARTER_PARTS, ...(p.owned ?? [])])] };
  } catch {
    cache = START;
  }
  return cache;
}
function write(s: HangarSave) {
  cache = { ...s, savedAt: Date.now() };
  raw = JSON.stringify(cache);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(`${KEY}-change`));
  window.dispatchEvent(new Event('uap-sync-change'));
}
const sub = (cb: () => void) => {
  window.addEventListener(`${KEY}-change`, cb);
  return () => window.removeEventListener(`${KEY}-change`, cb);
};
export const useHangar = () => useSyncExternalStore(sub, read, () => START);
export const getHangar = read;
export const level = () => craftLevel(read().scrapEarned);

export function addScrap(n: number, wave = 0) {
  const s = read();
  write({ ...s, scrap: s.scrap + n, scrapEarned: s.scrapEarned + n, bestWave: Math.max(s.bestWave, wave) });
}

/** Game drop: add a part to the collection. Returns whether it was new. */
export function findPart(id: string): boolean {
  const s = read();
  if (!PART_BY_ID[id] || s.owned.includes(id)) return false;
  write({ ...s, owned: [...s.owned, id] });
  return true;
}

export function buyPart(id: string): boolean {
  const s = read();
  const p = PART_BY_ID[id];
  if (!p || s.owned.includes(id)) return false;
  const price = BUY_PRICE[p.rarity];
  if (s.scrap < price) return false;
  write({ ...s, scrap: s.scrap - price, owned: [...s.owned, id] });
  return true;
}

export function equip(slot: Slot, id: string) {
  const s = read();
  if (!s.owned.includes(id) || PART_BY_ID[id]?.slot !== slot) return;
  write({ ...s, craft: { ...s.craft, [slot]: id } });
}

export function setColor(color: string) {
  const s = read();
  write({ ...s, craft: { ...s.craft, color } });
}

export const partPrice = (rarity: Rarity) => BUY_PRICE[rarity];
