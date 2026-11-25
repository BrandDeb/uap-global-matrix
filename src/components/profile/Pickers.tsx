'use client';

/**
 * src/components/profile/Pickers.tsx
 * Shared profile controls used by /settings and onboarding: alien avatar grid,
 * Light / Dark / Auto theme cards, and the (only) relevant permission —
 * location, used for "Near me" on the globe.
 */

import { useEffect, useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import AlienAvatar, { ALIENS } from './AlienAvatar';
import { saveProfile, useLocalProfile, type ThemePref } from '@/lib/profile';

export function AvatarPicker({ count = ALIENS.length }: { count?: number }) {
  const { avatar } = useLocalProfile();
  return (
    <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
      {ALIENS.slice(0, count).map((a, i) => (
        <button
          key={a.name}
          type="button"
          onClick={() => saveProfile({ avatar: i })}
          aria-pressed={avatar === i}
          aria-label={`Choose ${a.name}`}
          title={a.name}
          className={`group relative rounded-full p-0.5 transition ${avatar === i ? 'ring-2 ring-[var(--xeno-a)] ring-offset-2 ring-offset-[#0a0816]' : 'opacity-80 hover:opacity-100'}`}
        >
          <AlienAvatar index={i} size={52} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
        </button>
      ))}
    </div>
  );
}

export function NameField() {
  const { name } = useLocalProfile();
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Pilot name</span>
      <input
        value={name}
        onChange={(e) => saveProfile({ name: e.target.value.slice(0, 24) })}
        placeholder="e.g. StarlightSam"
        maxLength={24}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/25 focus:border-[var(--xeno-a)]/60 focus:outline-none"
      />
      <span className="mt-1.5 block text-[11px] text-white/35">Shown on comments, co-witness logs and arcade leaderboards.</span>
    </label>
  );
}

const THEMES: ReadonlyArray<{ id: ThemePref; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Auto' },
];

/** Mini screen preview, kept in true colors in either theme. */
function Preview({ mode }: { mode: ThemePref }) {
  const pane = (bg: string, fg: string, accent: string) => (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-1.5 overflow-hidden p-2.5" style={{ background: bg }}>
      <span className="h-1.5 w-8 rounded-full" style={{ background: fg, opacity: 0.5 }} />
      <span className="ml-auto h-3 w-3/5 rounded-full" style={{ background: accent }} />
      <span className="h-3 w-4/5 rounded-full" style={{ background: fg, opacity: 0.18 }} />
      <span className="mt-auto h-3 w-full rounded-full" style={{ background: fg, opacity: 0.18 }} />
    </div>
  );
  const light = pane('#f5f3ee', '#1b1830', '#c9bcff');
  const dark = pane('#05040d', '#ffffff', '#5effd8');
  return (
    <div data-keep-colors className="flex h-24 overflow-hidden rounded-2xl border border-white/10">
      {mode === 'light' ? light : mode === 'dark' ? dark : (
        <>
          {light}
          {dark}
        </>
      )}
    </div>
  );
}

export function ThemePicker() {
  const { theme } = useLocalProfile();
  return (
    <div className="grid grid-cols-3 gap-3">
      {THEMES.map((t) => (
        <button key={t.id} type="button" onClick={() => saveProfile({ theme: t.id })} aria-pressed={theme === t.id} className="min-w-0 text-center">
          <div className={`rounded-[20px] p-1 transition ${theme === t.id ? 'ring-2 ring-[var(--xeno-b)]' : ''}`}>
            <Preview mode={t.id} />
          </div>
          <span className={`mt-2 block text-sm ${theme === t.id ? 'font-semibold text-white' : 'text-white/55'}`}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function LocationPermission() {
  const [state, setState] = useState<PermState>('prompt');
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability probe
      setState('unsupported');
      return;
    }
    let status: PermissionStatus | null = null;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((s) => {
        status = s;
        setState(s.state as PermState);
        s.onchange = () => setState(s.state as PermState);
      })
      .catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  const request = () =>
    navigator.geolocation.getCurrentPosition(
      () => setState('granted'),
      () => setState('denied'),
      { timeout: 10000 },
    );

  return (
    <div className="flex items-center gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-[var(--xeno-a)]">
        <MapPin size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">Location</p>
        <p className="text-xs text-white/45">Only used for “Near me” — find sightings closest to you. Never stored or shared.</p>
      </div>
      {state === 'granted' ? (
        <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--xeno-a)]">
          <Check size={12} /> On
        </span>
      ) : state === 'denied' ? (
        <span className="max-w-[7rem] text-right text-[10px] text-white/40">Blocked — change in your browser’s site settings</span>
      ) : state === 'unsupported' ? (
        <span className="text-[10px] text-white/40">Not available</span>
      ) : (
        <button type="button" onClick={request} className="xeno-btn">
          Allow
        </button>
      )}
    </div>
  );
}
