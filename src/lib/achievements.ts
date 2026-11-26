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

import { BADGES } from './badges';
export { BADGES };

export type { BadgeId } from './badges';
import type { BadgeId } from './badges';

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
