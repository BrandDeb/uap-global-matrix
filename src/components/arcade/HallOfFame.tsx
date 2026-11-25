'use client';

import { useEffect, useState } from 'react';
import { PRIZES } from './Leaderboard';
import { awardBadge } from '@/lib/achievements';

interface Entry {
  handle: string;
  score: number;
}

/** Last week's top 3 per game: the weekly prize winners. */
export default function HallOfFame({ games }: { games: ReadonlyArray<{ id: string; title: string; color: string }> }) {
  const [data, setData] = useState<Record<string, Entry[]>>({});
  useEffect(() => {
    let alive = true;
    Promise.all(
      games.map((g) =>
        fetch(`/api/arcade/scores?game=${g.id}`, { cache: 'no-store' })
          .then((r) => r.json() as Promise<{ lastWeek?: Entry[] }>)
          .then((d) => [g.id, d.lastWeek ?? []] as const)
          .catch(() => [g.id, []] as const),
      ),
    ).then((rows) => {
      if (!alive) return;
      setData(Object.fromEntries(rows));
      let me = '';
      try {
        me = (localStorage.getItem('uap-arcade-handle') ?? '').trim().toLowerCase();
      } catch {
        /* ignore */
      }
      if (me && rows.some(([, r]) => r.some((e) => e.handle.toLowerCase() === me))) awardBadge('hall-of-fame');
    });
    return () => {
      alive = false;
    };
  }, [games]);

  return (
    <section className="mx-auto mt-14 max-w-6xl">
      <div className="mb-5 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">Weekly prizes</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase md:text-5xl">Hall of Fame</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/55">
          Every Monday the top 3 on each game earn a title: {PRIZES.map((p) => `${p.medal} ${p.title}`).join(' · ')}. These were last week’s champions.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {games.map((g) => {
          const rows = data[g.id];
          return (
            <div key={g.id} className="rounded-[22px] border border-white/10 bg-[#07060f] p-5">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase" style={{ color: g.color }}>
                {g.title}
              </h3>
              {!rows ? (
                <p className="mt-3 font-mono text-[10px] text-white/35">Loading…</p>
              ) : rows.length === 0 ? (
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">No champions yet. The throne is open.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {rows.map((e, i) => (
                    <li key={e.handle} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {PRIZES[i].medal} <span className="text-white/85">{e.handle}</span>
                        <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{PRIZES[i].title}</span>
                      </span>
                      <span className="font-mono text-xs text-white/60">{e.score.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
