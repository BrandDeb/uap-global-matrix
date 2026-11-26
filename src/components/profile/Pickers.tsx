'use client';

/**
 * src/components/profile/Pickers.tsx
 * Shared profile controls used by /settings and onboarding: alien avatar grid,
 * Light / Dark / Auto theme cards, and the (only) relevant permission, * location, used for "Near me" on the globe.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, MapPin, Bell } from 'lucide-react';
import { loadAlerts, saveAlerts } from '@/lib/alerts';
import { useBadges } from '@/lib/achievements';
import { PARTS, type Spec } from './AlienAvatar';
import AlienAvatar, { ALIENS } from './AlienAvatar';
import { saveProfile, useLocalProfile, type ThemePref } from '@/lib/profile';

export function AvatarPicker({ count = ALIENS.length }: { count?: number }) {
  const { avatar } = useLocalProfile();
  return (
    <div className="grid grid-cols-5 justify-items-center gap-x-2 gap-y-4 px-1 py-1">
      {ALIENS.slice(0, count).map((a, i) => (
        <button
          key={a.name}
          type="button"
          onClick={() => saveProfile({ avatar: i, custom: null })}
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
      <span className="mt-1.5 block text-[11px] text-white/35">A nickname or codename (no real names needed). Shown on comments, leaderboards and your pilot page.</span>
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
        <p className="text-xs text-white/45">Only used for “Near me”, find sightings closest to you. Never stored or shared.</p>
      </div>
      {state === 'granted' ? (
        <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--xeno-a)]">
          <Check size={12} /> On
        </span>
      ) : state === 'denied' ? (
        <span className="max-w-[7rem] text-right text-[10px] text-white/40">Blocked, change in your browser’s site settings</span>
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

/** Settings → nearby sighting alerts: asks for notification + location permission only when switched on. */
export function AlertsToggle() {
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener('uap-alerts-change', cb);
      return () => window.removeEventListener('uap-alerts-change', cb);
    },
    () => JSON.stringify(loadAlerts()),
    () => '{"on":false,"km":250}',
  );
  const p = JSON.parse(raw) as { on: boolean; km: number };
  const [msg, setMsg] = useState<string | null>(null);
  const supported = useSyncExternalStore(
    () => () => {},
    () => 'Notification' in window,
    () => true,
  );

  const enable = async () => {
    setMsg(null);
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setMsg('Notifications are blocked. Allow them in your browser’s site settings to use alerts.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Rounded to ~1 km: precise enough for "near you", never exact.
        const next = { ...loadAlerts(), on: true, lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100, since: new Date().toISOString() };
        saveAlerts(next);
      },
      () => setMsg('Location is needed to know which sightings are near you.'),
      { timeout: 10000 },
    );
  };
  const disable = () => {
    const next = { ...loadAlerts(), on: false };
    saveAlerts(next);
  };
  const setKm = (km: number) => {
    const next = { ...loadAlerts(), km };
    saveAlerts(next);
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-[var(--xeno-a)]">
          <Bell size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white">Sightings near me</p>
          <p className="text-xs text-white/45">A notification when someone reports a sighting near you. Your rounded location stays on this device.</p>
        </div>
        {!supported ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Not supported</span>
        ) : p.on ? (
          <button type="button" onClick={disable} className="xeno-btn">
            <Check size={12} /> On
          </button>
        ) : (
          <button type="button" onClick={() => void enable()} className="xeno-btn">
            Turn on
          </button>
        )}
      </div>
      {p.on && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pl-14">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Radius</span>
          {[50, 250, 1000].map((km) => (
            <button key={km} type="button" onClick={() => setKm(km)} aria-pressed={p.km === km} className={`rounded-full border px-3 py-1 font-mono text-[10px] ${p.km === km ? 'border-[var(--xeno-a)] text-white' : 'border-white/15 text-white/55'}`}>
              {km} km
            </button>
          ))}
        </div>
      )}
      {msg && <p className="mt-3 pl-14 text-xs text-[var(--xeno-d)]">{msg}</p>}
      <p className="mt-3 pl-14 text-[11px] text-white/35">Alerts arrive while a UAP/MATRIX tab is open (install the app to keep it handy).</p>
    </div>
  );
}


/** Build-your-own alien. Some parts unlock with badges. */
const LOCKS: Record<string, { badge: string; label: string }> = {
  'top:halo': { badge: 'hall-of-fame', label: 'Hall of Famer' },
  'top:spikes': { badge: 'night-5', label: 'Rodeo Survivor' },
  'eyes:visor': { badge: 'ghost', label: 'Radar Ghost' },
  'skin:#ffd36b': { badge: 'secrets-all', label: 'Truth Seeker' },
  'mouth:fangs': { badge: 'abductor', label: 'Friend Abductor' },
};

export function AlienBuilder() {
  const p = useLocalProfile();
  const have = useBadges();
  const base: Spec = p.custom ?? { ...ALIENS[p.avatar % ALIENS.length] };
  const [draft, setDraft] = useState<Spec>({ ...base, name: base.name || 'My alien' });
  const locked = (k: string, v: string) => {
    const l = LOCKS[`${k}:${v}`];
    return l && !have.includes(l.badge) ? l : null;
  };
  const cycle = <K extends 'head' | 'eyes' | 'top' | 'mouth' | 'skin' | 'bg'>(k: K, dir: number) => {
    const opts = PARTS[k] as string[];
    let i = opts.indexOf(draft[k] as string);
    for (let n = 0; n < opts.length; n++) {
      i = (i + dir + opts.length) % opts.length;
      if (!locked(k, opts[i])) break;
    }
    setDraft({ ...draft, [k]: opts[i] });
  };
  const random = () => {
    const pick = (k: keyof typeof PARTS) => {
      const ok = (PARTS[k] as string[]).filter((v) => !locked(k, v));
      return ok[Math.floor(Math.random() * ok.length)];
    };
    setDraft({ ...draft, head: pick('head') as Spec['head'], eyes: pick('eyes') as Spec['eyes'], top: pick('top') as Spec['top'], mouth: pick('mouth') as Spec['mouth'], skin: pick('skin'), bg: pick('bg'), spots: Math.random() < 0.3 });
  };
  const rows: { k: 'head' | 'eyes' | 'top' | 'mouth' | 'skin' | 'bg'; label: string }[] = [
    { k: 'head', label: 'Head' },
    { k: 'eyes', label: 'Eyes' },
    { k: 'top', label: 'Topper' },
    { k: 'mouth', label: 'Mouth' },
    { k: 'skin', label: 'Skin' },
    { k: 'bg', label: 'Backdrop' },
  ];
  const lockedList = Object.entries(LOCKS).filter(([, l]) => !have.includes(l.badge));
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div className="flex flex-col items-center gap-3">
        <AlienAvatar index={0} spec={draft} size={132} className="drop-shadow-[0_0_30px_rgba(165,139,255,0.4)]" />
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 16) })}
          aria-label="Alien name"
          className="w-36 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-center text-sm text-white focus:border-[var(--xeno-a)]/60 focus:outline-none"
        />
      </div>
      <div className="w-full flex-1 space-y-2">
        {rows.map(({ k, label }) => (
          <div key={k} className="flex items-center justify-between gap-2">
            <span className="w-20 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</span>
            <button type="button" onClick={() => cycle(k, -1)} className="rounded-full border border-white/15 px-3 py-1 text-white/70 hover:text-white" aria-label={`Previous ${label}`}>‹</button>
            <span className="flex-1 text-center text-sm capitalize text-white/80">
              {k === 'skin' || k === 'bg' ? <span className="inline-block h-4 w-10 rounded-full align-middle" style={{ background: draft[k] }} /> : String(draft[k])}
            </span>
            <button type="button" onClick={() => cycle(k, 1)} className="rounded-full border border-white/15 px-3 py-1 text-white/70 hover:text-white" aria-label={`Next ${label}`}>›</button>
          </div>
        ))}
        <label className="flex items-center gap-2 pt-1 text-xs text-white/60">
          <input type="checkbox" checked={!!draft.spots} onChange={(e) => setDraft({ ...draft, spots: e.target.checked })} /> Spots
        </label>
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={random} className="xeno-btn">🎲 Random</button>
          <button type="button" onClick={() => saveProfile({ custom: draft })} className="xeno-btn !border-[var(--xeno-a)]">Use this alien</button>
        </div>
        {lockedList.length > 0 && (
          <p className="pt-2 text-[11px] leading-relaxed text-white/40">
            🔒 Rare parts: {lockedList.map(([k, l]) => `${k.split(':')[1].startsWith('#') ? 'gold skin' : k.split(':')[1]} (${l.label})`).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
