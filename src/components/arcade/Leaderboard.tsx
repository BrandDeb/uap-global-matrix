'use client';

/**
 * src/components/arcade/Leaderboard.tsx
 * Game-over leaderboard: post your score under a saved name, see this week's
 * top 10 (weekly reset Monday 00:00 UTC) with your row highlighted.
 */

import { useCallback, useEffect, useState } from 'react';
import { xenoAudio } from '@/components/landing/audio';

interface Entry {
  handle: string;
  score: number;
}

const NAME_KEY = 'uap-arcade-handle';

export default function Leaderboard({ game, score }: { game: string; score: number }) {
  const [weekly, setWeekly] = useState<Entry[] | null>(null);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [posted, setPosted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/arcade/scores?game=${game}`, { cache: 'no-store' });
      const d = (await r.json()) as { weekly?: Entry[] };
      setWeekly(d.weekly ?? []);
    } catch {
      setWeekly([]);
    }
  }, [game]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/arcade/scores?game=${game}`, { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ weekly?: Entry[] }>)
      .then((d) => alive && setWeekly(d.weekly ?? []))
      .catch(() => alive && setWeekly([]));
    return () => {
      alive = false;
    };
  }, [game]);

  const post = async () => {
    setError(null);
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* private mode */
    }
    const r = await fetch('/api/arcade/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game, handle: name, score }),
    });
    const d = (await r.json().catch(() => ({}))) as { handle?: string; error?: string };
    if (!r.ok) {
      setError(d.error ?? 'Could not post score.');
      return;
    }
    setPosted(d.handle ?? name);
    xenoAudio?.chime();
    void load();
  };

  const rank = weekly ? weekly.filter((e) => e.score > score).length + 1 : null;

  return (
    <div className="pointer-events-auto mt-5 w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 p-4 text-left">
      <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.3em]">
        <span className="text-[var(--xeno-a)]">This week’s top 10</span>
        {rank !== null && score > 0 && !posted && <span className="text-white/50">you’d place #{rank}</span>}
      </div>
      {weekly === null ? (
        <p className="font-mono text-[10px] text-white/40">Loading…</p>
      ) : weekly.length === 0 ? (
        <p className="font-mono text-[10px] text-white/40">No scores yet this week — claim the throne.</p>
      ) : (
        <ol className="space-y-0.5 font-mono text-xs">
          {weekly.map((e, i) => (
            <li
              key={e.handle}
              className={`flex justify-between rounded px-2 py-0.5 ${e.handle === posted ? 'bg-[var(--xeno-a)]/15 text-[var(--xeno-a)]' : 'text-white/75'}`}
            >
              <span>
                {i === 0 ? '👑' : `${i + 1}.`} {e.handle}
              </span>
              <span>{e.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
      {score > 0 && !posted && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void post();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Your pilot name"
            aria-label="Your name for the leaderboard"
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 font-mono text-xs text-white placeholder:text-white/30 focus:border-[var(--xeno-a)]/60 focus:outline-none"
          />
          <button type="submit" disabled={name.trim().length < 2} className="rounded-full bg-[var(--xeno-a)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black disabled:opacity-40">
            Post
          </button>
        </form>
      )}
      {error && <p className="mt-2 font-mono text-[10px] text-[var(--xeno-d)]">{error}</p>}
    </div>
  );
}
