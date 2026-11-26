'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { xenoAudio } from '@/components/landing/audio';
import ShareBar from '@/components/ShareBar';
import { ANSWERS, type AnswerId } from '@/lib/daily';
import { awardBadge, SYNC_EVENT } from '@/lib/achievements';
import { useLocalProfile } from '@/lib/profile';
import { refreshCards } from '@/lib/collection';

interface Today {
  day: number;
  case: { title: string; year: number; place: string; clue: string };
  split: Record<string, number>;
  total: number;
  streaks: { handle: string; streak: number }[];
}
interface Saved {
  lastDay: number;
  streak: number;
  best: number;
  played: number;
  wins: number;
  today?: { day: number; guess: AnswerId; correct: boolean; answer: AnswerId; reveal: string };
}
const KEY = 'uap-daily';
const empty: Saved = { lastDay: -1, streak: 0, best: 0, played: 0, wins: 0 };

function load(): Saved {
  try {
    return { ...empty, ...(JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? {}) };
  } catch {
    return empty;
  }
}

export default function DailyChallenge() {
  const [today, setToday] = useState<Today | null>(null);
  const [saved, setSaved] = useState<Saved>(empty);
  const [busy, setBusy] = useState(false);
  const profile = useLocalProfile();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read local streak once on mount
    setSaved(load());
    fetch('/api/daily', { cache: 'no-store' })
      .then((r) => r.json() as Promise<Today>)
      .then(setToday)
      .catch(() => {});
  }, []);

  const result = today && saved.today?.day === today.day ? saved.today : null;

  const guess = async (g: AnswerId) => {
    if (!today || result || busy) return;
    setBusy(true);
    const prev = load();
    const continuing = prev.lastDay === today.day - 1;
    const nextStreakIfRight = continuing ? prev.streak + 1 : 1;
    let handle = '';
    try {
      handle = localStorage.getItem('uap-arcade-handle') ?? profile.name ?? '';
    } catch {
      /* ignore */
    }
    const r = await fetch('/api/daily', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ guess: g, handle, streak: nextStreakIfRight }),
    });
    const d = (await r.json()) as { correct: boolean; answer: AnswerId; reveal: string };
    const streak = d.correct ? nextStreakIfRight : 0;
    const next: Saved = {
      lastDay: d.correct ? today.day : prev.lastDay,
      streak,
      best: Math.max(prev.best, streak),
      played: prev.played + 1,
      wins: prev.wins + (d.correct ? 1 : 0),
      today: { day: today.day, guess: g, correct: d.correct, answer: d.answer, reveal: d.reveal },
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    window.dispatchEvent(new Event(SYNC_EVENT));
    setSaved(next);
    setToday({ ...today, split: { ...today.split, [g]: (today.split[g] ?? 0) + 1 }, total: today.total + 1 });
    if (d.correct) {
      xenoAudio?.chime();
      void refreshCards(); // the server granted a summon signal
    }
    else xenoAudio?.boop();
    if (streak >= 7) awardBadge('daily-7');
    setBusy(false);
  };

  return (
    <main className="mx-auto min-h-[100svh] max-w-3xl px-5 pb-20 pt-6">
      <Link href="/" className="xeno-btn">
        <ArrowLeft size={12} /> Home
      </Link>
      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">Daily challenge · {today ? `#${today.day}` : '…'}</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-6xl">
        What was <span className="xeno-gradient-text">it?</span>
      </h1>
      <p className="mt-3 text-white/55">One real sighting a day. Read the report, make the call. Keep your streak alive.</p>

      <div className="mt-6 flex gap-6 font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
        <span>
          Streak <b className="text-lg text-[var(--xeno-a)]">{saved.streak}</b>
        </span>
        <span>
          Best <b className="text-lg text-white">{saved.best}</b>
        </span>
        <span>
          Won <b className="text-lg text-white">{saved.wins}</b>/{saved.played}
        </span>
      </div>

      {today && (
        <article className="xeno-glass mt-8 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--xeno-a)]">
            {today.case.place} · {today.case.year}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold">{today.case.title}</h2>
          <p className="mt-3 text-lg leading-relaxed text-white/75">{today.case.clue}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {ANSWERS.map((a) => {
              const n = today.split[a.id] ?? 0;
              const pct = today.total ? Math.round((n / today.total) * 100) : 0;
              const isAnswer = result?.answer === a.id;
              const isMine = result?.guess === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!!result || busy}
                  onClick={() => void guess(a.id)}
                  className={`relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition ${
                    isAnswer ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/10' : isMine ? 'border-[var(--xeno-d)] bg-[var(--xeno-d)]/10' : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  {result && <span aria-hidden className="absolute inset-y-0 left-0 bg-white/5" style={{ width: `${pct}%` }} />}
                  <span className="relative flex justify-between">
                    <span className="font-semibold">{a.label}</span>
                    {result && <span className="font-mono text-xs text-white/50">{pct}%</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {result && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className={`font-[family-name:var(--font-display)] text-xl font-extrabold ${result.correct ? 'text-[var(--xeno-a)]' : 'text-[var(--xeno-d)]'}`}>
                {result.correct ? `Correct. Streak ${saved.streak} 🔥 · +1 summon signal (signed in)` : 'Not quite.'}
              </p>
              <p className="mt-2 leading-relaxed text-white/70">{result.reveal}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">New case at midnight UTC</p>
              <ShareBar
                className="mt-4"
                url="https://uap-global-matrix.vercel.app/daily"
                text={`UAP Daily #${today.day}: ${result.correct ? '✅' : '❌'} streak ${saved.streak} 🛸 Can you crack today's sighting?`}
              />
            </div>
          )}
        </article>
      )}

      {today && today.streaks.length > 0 && (
        <section className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Longest live streaks</h2>
          <ol className="mt-3 space-y-1 font-mono text-sm">
            {today.streaks.map((s, i) => (
              <li key={s.handle} className="flex justify-between rounded px-2 py-1 text-white/75 odd:bg-white/[0.03]">
                <span>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`} {s.handle}
                </span>
                <span>🔥 {s.streak}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
