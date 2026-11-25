'use client';

/**
 * src/lib/profile.ts
 * ---------------------------------------------------------------------------
 * The visitor's local profile, pilot name, alien avatar, theme preference,
 * onboarding state, persisted in localStorage and exposed as a reactive store
 * (useSyncExternalStore), so every component updates the moment it changes.
 * Signed-in operators still post under their verified handle server-side.
 * ---------------------------------------------------------------------------
 */
import { useSyncExternalStore } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

export interface LocalProfile {
  name: string;
  avatar: number;
  theme: ThemePref;
  onboarded: boolean;
}

const KEY = 'uap-profile';
const EVENT = 'uap-profile-change';
const DEFAULT: LocalProfile = { name: '', avatar: 0, theme: 'dark', onboarded: false };

let cache: LocalProfile | null = null;
let cacheRaw: string | null = null;

function read(): LocalProfile {
  if (typeof window === 'undefined') return DEFAULT;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (cache && raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    cache = { ...DEFAULT, ...(raw ? (JSON.parse(raw) as Partial<LocalProfile>) : {}) };
  } catch {
    cache = DEFAULT;
  }
  return cache;
}

export function saveProfile(patch: Partial<LocalProfile>): void {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: changes last for this tab only */
    cache = next;
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  cache = null;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** Reactive local profile (server snapshot = defaults). */
export function useLocalProfile(): LocalProfile {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}

/** Non-hook read for event handlers. */
export function getLocalProfile(): LocalProfile {
  return read();
}

/** Apply a theme preference to <html data-theme>. */
export function applyTheme(pref: ThemePref): void {
  const dark = pref === 'dark' || (pref === 'system' && !window.matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
