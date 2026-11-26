'use client';

/**
 * Keeps the local profile (pilot name, alien, theme, secrets, badges, arcade
 * bests, daily streak) in step with the signed-in account so it follows you
 * across devices. Merge rule: unions for secrets/badges, max for scores, and
 * the account wins for name/avatar unless this device has never onboarded.
 * Does nothing when signed out.
 */
import { useEffect } from 'react';
import { getBadges, setBadges, SYNC_EVENT } from '@/lib/achievements';
import { mergeEggs, readEggs } from '@/components/landing/eggs';
import { saveProfile } from '@/lib/profile';

const GAMES = ['moove-it', 'junk-invaders', 'gravity-janitor', 'radar-ghost'];

interface Prefs {
  name?: string;
  avatar?: number;
  theme?: 'light' | 'dark' | 'system';
  onboarded?: boolean;
  eggs?: string[];
  badges?: string[];
  bests?: Record<string, number>;
  daily?: unknown;
  keeper?: { savedAt?: number };
  hangar?: { savedAt?: number };
  cards?: { savedAt?: number };
  bio?: string;
  custom?: unknown;
}

/** Game saves synced whole; the newer save (by savedAt) wins. */
const SAVES = { keeper: 'uap-keeper', hangar: 'uap-hangar', cards: 'uap-cards' } as const;
const readSave = (k: string) => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
};

function local(): Prefs {
  let profile: Prefs = {};
  let daily: unknown;
  try {
    profile = JSON.parse(localStorage.getItem('uap-profile') ?? '{}') as Prefs;
    daily = JSON.parse(localStorage.getItem('uap-daily') ?? 'null');
  } catch {
    /* ignore */
  }
  const bests: Record<string, number> = {};
  for (const g of GAMES) bests[g] = Number(localStorage.getItem(`uap-arcade-best:${g}`) ?? 0) || 0;
  return {
    name: profile.name,
    avatar: profile.avatar,
    theme: profile.theme,
    onboarded: profile.onboarded,
    bio: profile.bio,
    custom: (profile as { custom?: unknown }).custom ?? undefined,
    eggs: readEggs(),
    badges: getBadges(),
    bests,
    daily: daily ?? undefined,
    keeper: readSave(SAVES.keeper),
    hangar: readSave(SAVES.hangar),
    cards: readSave(SAVES.cards),
  };
}

export default function ProfileSync() {
  useEffect(() => {
    let signedIn = false;
    let timer: number | undefined;
    let applying = false;

    const push = () => {
      if (!signedIn || applying) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void fetch('/api/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefs: local() }) }).catch(() => {});
      }, 1500);
    };

    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ profile: unknown; prefs: Prefs | null }>)
      .then(({ profile, prefs }) => {
        if (!profile) return;
        signedIn = true;
        const remote = prefs ?? {};
        const mine = local();
        applying = true;
        if (remote.onboarded && (!mine.onboarded || !mine.name)) {
          saveProfile({ name: remote.name ?? '', avatar: remote.avatar ?? 0, theme: remote.theme ?? 'dark', onboarded: true, bio: remote.bio, custom: (remote.custom as never) ?? null });
        }
        if (remote.eggs?.length) mergeEggs(remote.eggs);
        if (remote.badges?.length) setBadges([...getBadges(), ...remote.badges]);
        for (const [g, v] of Object.entries(remote.bests ?? {})) {
          if (v > (mine.bests?.[g] ?? 0)) localStorage.setItem(`uap-arcade-best:${g}`, String(v));
        }
        if (remote.daily && !mine.daily) localStorage.setItem('uap-daily', JSON.stringify(remote.daily));
        for (const [field, key] of Object.entries(SAVES) as [keyof typeof SAVES, string][]) {
          const r = remote[field];
          const m = mine[field];
          if (r && (!m || (r.savedAt ?? 0) > (m.savedAt ?? 0))) {
            localStorage.setItem(key, JSON.stringify(r));
            window.dispatchEvent(new Event(`${key}-change`));
          }
        }
        applying = false;
        push();
      })
      .catch(() => {});

    window.addEventListener(SYNC_EVENT, push);
    window.addEventListener('uap-profile-change', push);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SYNC_EVENT, push);
      window.removeEventListener('uap-profile-change', push);
    };
  }, []);
  return null;
}
