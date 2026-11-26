'use client';

/**
 * src/lib/hangarStore.ts, client view of the server-authoritative Hangar.
 * All state comes from /api/hangar; actions post there and re-fetch. Parts,
 * scrap and the raid lifecycle (launch/extract/die) are owned by the server
 * so a browser can't fabricate inventory or dodge Tarkov-style loss.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_BLUEPRINT, type Blueprint, type Craft } from './craft';

export interface HangarView {
  craft: Blueprint;
  secure: string | null;
  scrap: number;
  scrap_earned: number;
  best_wave: number;
  raid: { seed: number; startedAt: number; insured: boolean; atRisk: string[] } | null;
}
export interface HangarState {
  status: 'loading' | 'signed-out' | 'ready' | 'error';
  hangar: HangarView;
  owned: Record<string, number>;
}
const EMPTY_HANGAR: HangarView = { craft: DEFAULT_BLUEPRINT, secure: null, scrap: 0, scrap_earned: 0, best_wave: 0, raid: null };
const EMPTY: HangarState = { status: 'loading', hangar: EMPTY_HANGAR, owned: {} };

let state = EMPTY;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function refreshHangar(): Promise<void> {
  inflight ??= fetch('/api/hangar', { cache: 'no-store' })
    .then(async (r) => {
      if (r.status === 401) state = { ...EMPTY, status: 'signed-out' };
      else if (!r.ok) state = { ...state, status: 'error' };
      else {
        const d = (await r.json()) as { hangar: HangarView; owned: Record<string, number> };
        state = { status: 'ready', hangar: d.hangar, owned: d.owned };
        try {
          localStorage.setItem('uap-hangar', JSON.stringify({ savedAt: Date.now(), bestWave: d.hangar.best_wave, scrapEarned: d.hangar.scrap_earned }));
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
export function useHangar(): HangarState {
  const s = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  useEffect(() => {
    if (state.status === 'loading') void refreshHangar();
  }, []);
  return s;
}

/** Run a Hangar action; returns the JSON body and refreshes state. */
export async function hangarAction<T = Record<string, unknown>>(action: string, extra: Record<string, unknown> = {}): Promise<T & { error?: string }> {
  const r = await fetch('/api/hangar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
  const d = (await r.json().catch(() => ({ error: 'Network error.' }))) as T & { error?: string };
  await refreshHangar();
  return d;
}
export type { Craft };
