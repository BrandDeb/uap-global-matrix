'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBadges } from '@/lib/achievements';
import { useFoundEggs } from '@/components/landing/eggs';
import { saveProfile, useLocalProfile } from '@/lib/profile';
import { rankOf, RANKS, xpOf } from '@/lib/xp';

function readLocal() {
  const bests: Record<string, number> = {};
  let daily = null;
  let keeper = null;
  let hangar = null;
  let cards = null;
  try {
    for (const g of ['moove-it', 'junk-invaders', 'gravity-janitor', 'radar-ghost', 'star-forge']) bests[g] = Number(localStorage.getItem(`uap-arcade-best:${g}`) ?? 0) || 0;
    daily = JSON.parse(localStorage.getItem('uap-daily') ?? 'null');
    keeper = JSON.parse(localStorage.getItem('uap-keeper') ?? 'null');
    hangar = JSON.parse(localStorage.getItem('uap-hangar') ?? 'null');
    cards = JSON.parse(localStorage.getItem('uap-cards') ?? 'null');
  } catch {
    /* ignore */
  }
  return { bests, daily, keeper, hangar, cards };
}

/** XP bar + rank ladder; links to the public pilot page when signed in. */
export function RankCard({ handle }: { handle: string }) {
  const badges = useBadges();
  const eggs = useFoundEggs();
  const [extra, setExtra] = useState<ReturnType<typeof readLocal> | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read local saves once on mount
    setExtra(readLocal());
  }, []);
  const xp = xpOf({ badges, eggs, ...(extra ?? {}) });
  const r = rankOf(xp);
  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {r.icon} {r.name}
        </p>
        <p className="font-mono text-xs text-white/55">{xp.toLocaleString()} XP</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--xeno-b),var(--xeno-a))]" style={{ width: `${Math.round(r.progress * 100)}%` }} />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        {r.next ? `${(r.next.min - xp).toLocaleString()} XP to ${r.next.icon} ${r.next.name}` : 'Top rank reached'}
      </p>
      <ol className="mt-4 flex flex-wrap gap-1.5">
        {RANKS.map((k) => (
          <li key={k.name} className={`rounded-full border px-2 py-0.5 text-[10px] ${xp >= k.min ? 'border-[var(--xeno-a)]/50 text-white' : 'border-white/10 text-white/35'}`}>
            {k.icon} {k.name}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-white/45">Earn XP from secrets, badges, arcade scores, the Daily Challenge, Xeno Keeper and the Hangar.</p>
      {handle ? (
        <Link href={`/pilot/${handle}`} className="xeno-btn mt-4">
          View my public pilot page ↗
        </Link>
      ) : (
        <p className="mt-4 text-xs text-white/45">Sign in to get a public pilot page and ID card.</p>
      )}
    </div>
  );
}

export function BioField() {
  const p = useLocalProfile();
  return (
    <label className="mt-6 block">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Bio (public)</span>
      <textarea
        value={p.bio ?? ''}
        onChange={(e) => saveProfile({ bio: e.target.value.slice(0, 160) })}
        rows={2}
        placeholder="Saw a light over Hackney once. Never been the same."
        className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[var(--xeno-a)]/60 focus:outline-none"
      />
    </label>
  );
}

/** Change the public handle (signed-in only). Real names are never required. */
export function HandleField({ current }: { current: string }) {
  const [v, setV] = useState(current);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    setMsg(null);
    const r = await fetch('/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: v }) });
    const d = (await r.json().catch(() => ({}))) as { error?: string; note?: string };
    setMsg(r.ok ? `Saved. ${d.note ?? ''}` : (d.error ?? 'Could not save.'));
  };
  return (
    <div className="mt-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Public handle</span>
      <div className="mt-2 flex gap-2">
        <span className="grid place-items-center pl-2 text-white/40">@</span>
        <input value={v} onChange={(e) => setV(e.target.value.slice(0, 24))} aria-label="Public handle" className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-[var(--xeno-a)]/60 focus:outline-none" />
        <button type="button" onClick={() => void save()} disabled={v === current} className="xeno-btn disabled:opacity-40">
          Save
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-white/40">Shown in Comms, leaderboards and your pilot page. Use a codename; your real name is never shown unless you choose to.</p>
      {msg && <p className="mt-1 text-xs text-[var(--xeno-a)]">{msg}</p>}
    </div>
  );
}
