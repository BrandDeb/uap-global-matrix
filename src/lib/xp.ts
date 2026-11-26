/**
 * src/lib/xp.ts, pilot XP and ranks, computed from synced profile data so it
 * is identical on the client (Settings) and the server (public pilot pages).
 */
export const RANKS = [
  { min: 0, name: 'Cadet', icon: '🛰' },
  { min: 500, name: 'Sky Watcher', icon: '🔭' },
  { min: 1500, name: 'Field Agent', icon: '🕵️' },
  { min: 3500, name: 'Abductee', icon: '🐄' },
  { min: 7000, name: 'Close Encounter', icon: '👽' },
  { min: 12000, name: 'Mothership Captain', icon: '🛸' },
  { min: 20000, name: 'Galactic Overlord', icon: '👑' },
] as const;

export interface XpSource {
  eggs?: string[];
  badges?: string[];
  bests?: Record<string, number>;
  daily?: { wins?: number; best?: number } | null;
  keeper?: { xp?: number } | null;
  hangar?: { xp?: number } | null;
}

export function xpOf(p: XpSource): number {
  const eggs = (p.eggs?.length ?? 0) * 100;
  const badges = (p.badges?.length ?? 0) * 500;
  const arcade = Object.values(p.bests ?? {}).reduce((sum, v) => sum + Math.min(2000, Math.floor((Number(v) || 0) / 50)), 0);
  const daily = (p.daily?.wins ?? 0) * 60 + (p.daily?.best ?? 0) * 40;
  const keeper = Math.min(20000, p.keeper?.xp ?? 0);
  const hangar = Math.min(10000, p.hangar?.xp ?? 0);
  return Math.floor(eggs + badges + arcade + daily + keeper + hangar);
}

export function rankOf(xp: number) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].min) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  return { ...cur, level: i + 1, next, progress: next ? (xp - cur.min) / (next.min - cur.min) : 1 };
}
