'use client';

/**
 * src/lib/collection.ts, client view of the server-owned card collection.
 * All changes go through /api/cards; this store just caches the last state
 * and re-fetches after every action.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { Owned } from './cards';

export interface WalletView {
  signals: number;
  energy: number;
  pity: number;
  pulls: number;
  wins: number;
  losses: number;
  team: string[];
  last_daily: string | null;
  scan_day: string | null;
  scans: number;
  series_claimed?: number[];
}
export interface CardsState {
  status: 'loading' | 'signed-out' | 'ready' | 'error';
  wallet: WalletView;
  owned: Record<string, Owned>;
}
const EMPTY: CardsState = {
  status: 'loading',
  wallet: { signals: 0, energy: 0, pity: 0, pulls: 0, wins: 0, losses: 0, team: [], last_daily: null, scan_day: null, scans: 0 },
  owned: {},
};

let state = EMPTY;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function refreshCards(): Promise<void> {
  inflight ??= fetch('/api/cards', { cache: 'no-store' })
    .then(async (r) => {
      if (r.status === 401) state = { ...EMPTY, status: 'signed-out' };
      else if (!r.ok) state = { ...state, status: 'error' };
      else {
        const d = (await r.json()) as { wallet: WalletView; owned: Record<string, Owned> };
        state = { status: 'ready', wallet: d.wallet, owned: d.owned };
        // Mirror a summary for XP / pilot page sync.
        try {
          localStorage.setItem('uap-cards', JSON.stringify({ savedAt: Date.now(), owned: d.owned, wins: d.wallet.wins }));
          window.dispatchEvent(new Event('uap-sync-change'));
        } catch {
          /* ignore */
        }
      }
      emit();
    })
    .catch(() => {
      state = { ...state, status: 'error' };
      emit();
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useCollection(): CardsState {
  const s = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  useEffect(() => {
    if (state.status === 'loading') void refreshCards();
  }, []);
  return s;
}

/** Run a server action, then refresh. Returns the JSON body (or { error }). */
export async function cardAction<T = Record<string, unknown>>(action: string, extra: Record<string, unknown> = {}): Promise<T & { error?: string }> {
  const r = await fetch('/api/cards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
  const d = (await r.json().catch(() => ({ error: 'Network error.' }))) as T & { error?: string };
  void refreshCards();
  return d;
}
