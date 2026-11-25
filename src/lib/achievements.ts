'use client';

/**
 * src/lib/achievements.ts
 * ---------------------------------------------------------------------------
 * Achievement badges, stored locally (and synced to the account by
 * ProfileSync when signed in). `awardBadge` celebrates the first unlock only.
 * ---------------------------------------------------------------------------
 */
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';

export const BADGES = [
  { id: 'hall-of-fame', icon: '🏆', name: 'Hall of Famer', how: 'Finish a week in the top 3 of any arcade game.' },
  { id: 'night-5', icon: '🌅', name: 'Rodeo Survivor', how: 'Clear Night 5 (Area 51 Rodeo) in Moo-ve It.' },
  { id: 'secrets-all', icon: '🥚', name: 'Truth Seeker', how: 'Find all 8 secrets on the landing page.' },
  { id: 'lineup', icon: '👽', name: 'Xenobiologist', how: 'Meet every visitor in the voxel lineup.' },
  { id: 'abductor', icon: '🐄', name: 'Friend Abductor', how: 'Beam up a friend in Moo-ve It.' },
  { id: 'crop-artist', icon: '🌾', name: 'Crop Artist', how: 'Publish a crop circle to the gallery.' },
  { id: 'daily-7', icon: '📅', name: 'Week Watcher', how: 'Keep a 7-day Daily Challenge streak.' },
  { id: 'ghost', icon: '📡', name: 'Radar Ghost', how: 'Reach sector 5 in Radar Ghost undetected.' },
] as const;

export type BadgeId = (typeof BADGES)[number]['id'];

export const BADGE_KEY = 'uap_badges_v1';
export const SYNC_EVENT = 'uap-sync-change';
let cache: string | null = null;

function read(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(BADGE_KEY) ?? '';
    cache = raw;
    return raw;
  } catch {
    return cache ?? '';
  }
}

export function getBadges(): string[] {
  return read().split(',').filter(Boolean);
}

/** Replace the stored set (used when merging from the account). */
export function setBadges(ids: string[]) {
  const v = [...new Set(ids)].join(',');
  cache = v;
  try {
    localStorage.setItem(BADGE_KEY, v);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function awardBadge(id: BadgeId) {
  if (typeof window === 'undefined') return;
  const have = getBadges();
  if (have.includes(id)) return;
  setBadges([...have, id]);
  const b = BADGES.find((x) => x.id === id)!;
  toast(`${b.icon} Badge unlocked: ${b.name}`, { description: b.how });
}

const subscribe = (cb: () => void) => {
  window.addEventListener(SYNC_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(SYNC_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
};

export function useBadges(): string[] {
  return useSyncExternalStore(subscribe, read, () => '').split(',').filter(Boolean);
}
