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
  try {
    for (const g of ['moove-it', 'junk-invaders', 'gravity-janitor', 'radar-ghost', 'star-forge']) bests[g] = Number(localStorage.getItem(`uap-arcade-best:${g}`) ?? 0) || 0;
    daily = JSON.parse(localStorage.getItem('uap-daily') ?? 'null');
    keeper = JSON.parse(localStorage.getItem('uap-keeper') ?? 'null');
    hangar = JSON.parse(localStorage.getItem('uap-hangar') ?? 'null');
  } catch {
    /* ignore */
  }
  return { bests, daily, keeper, hangar };
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
