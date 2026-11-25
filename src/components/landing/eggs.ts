'use client';

/**
 * src/components/landing/eggs.ts
 * ---------------------------------------------------------------------------
 * Easter-egg hunt: a list of secrets with cryptic hints, progress saved in
 * localStorage and exposed as a reactive store. `findEgg(id)` celebrates the
 * first discovery only.
 * ---------------------------------------------------------------------------
 */
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { xenoAudio } from './audio';

export const EGGS = [
  { id: 'invasion', name: 'Full invasion', hint: 'An old gamer’s code summons company. Or bully the fine print, five times.' },
  { id: 'boop', name: 'Saucer boop', hint: 'The ship at the top of the page is very boopable.' },
  { id: 'explode', name: 'Cube cloud', hint: 'The intern does not enjoy being clicked. Do it anyway.' },
  { id: 'lineup', name: 'Full lineup', hint: 'Meet every witness-reported visitor in Zorp’s section.' },
  { id: 'moo', name: 'Bovine solidarity', hint: 'Speak the cow’s language. Just type it.' },
  { id: 'roswell', name: 'Crash site', hint: 'Type the name of the most famous town in UFO history.' },
  { id: 'truth', name: 'The truth', hint: 'The logo knows something. Tap it until it talks (seven should do).' },
  { id: 'night', name: 'Night shift', hint: 'Some signals only come through between midnight and 4 am.' },
] as const;

export type EggId = (typeof EGGS)[number]['id'];

const KEY = 'uap_eggs_v1';
const listeners = new Set<() => void>();
let cache: string | null = null;

function read(): string {
  if (cache !== null) return cache;
  try {
    cache = window.localStorage.getItem(KEY) ?? '';
  } catch {
    cache = '';
  }
  return cache;
}

export function findEgg(id: EggId) {
  if (typeof window === 'undefined') return;
  const found = read().split(',').filter(Boolean);
  if (found.includes(id)) return;
  found.push(id);
  cache = found.join(',');
  try {
    window.localStorage.setItem(KEY, cache);
  } catch {
    /* private mode: progress lasts this visit */
  }
  listeners.forEach((l) => l());
  const egg = EGGS.find((e) => e.id === id)!;
  const all = found.length === EGGS.length;
  toast(all ? '🛸 ALL SECRETS FOUND' : `🥚 Secret found: ${egg.name}`, {
    description: all ? 'You are now an honorary member of the crew. Zorp is proud of you.' : `${found.length} of ${EGGS.length} discovered.`,
  });
  xenoAudio?.chime();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Reactive list of found egg ids. */
export function useFoundEggs(): string[] {
  const raw = useSyncExternalStore(subscribe, read, () => '');
  return raw.split(',').filter(Boolean);
}
