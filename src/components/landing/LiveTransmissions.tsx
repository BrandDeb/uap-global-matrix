'use client';

/**
 * src/components/landing/LiveTransmissions.tsx
 * ---------------------------------------------------------------------------
 * Real data on the landing page: the most credible contacts from /api/matrix.
 * A spotlight card auto-rotates every few seconds (title decrypts in, a
 * credibility meter fills, coordinates tick) next to a grid of the rest.
 * Every card deep-links to its shareable /case/:id page.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import DecryptedText from '@/components/fx/DecryptedText';
import type { LiveSighting } from '@/lib/sightings';
import { xenoAudio } from './audio';

const fmtCoord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? pos : neg}`;

export default function LiveTransmissions({ sightings }: { sightings: readonly LiveSighting[] }) {
  const top = [...sightings].sort((a, b) => b.credibilityScore - a.credibilityScore).slice(0, 7);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || top.length < 2) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % top.length), 4200);
    return () => window.clearInterval(id);
  }, [paused, top.length]);

  if (top.length === 0) return null;
  const s = top[i % top.length];

  return (
    <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
      {/* Spotlight */}
      <Link
        href={`/case/${s.id}`}
        data-cursor="OPEN"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        className="xeno-glass group relative flex min-h-[340px] flex-col justify-between overflow-hidden p-6 md:p-8"
      >
        {/* radar sweep */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[var(--xeno-a)]/20 [background:conic-gradient(from_0deg,transparent_0deg,rgba(94,255,216,0.25)_40deg,transparent_60deg)] animate-[spin_4s_linear_infinite]"
        />
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em]">
          <span className="flex items-center gap-2 text-[var(--xeno-d)]">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-current" /> Incoming
          </span>
          <span className="text-white/40">
            {fmtCoord(s.latitude, 'N', 'S')} · {fmtCoord(s.longitude, 'E', 'W')}
          </span>
        </div>
        <div>
          <p className="font-mono text-xs text-white/40">{new Date(s.eventTimestamp).getUTCFullYear()} · {s.locationName}</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium leading-tight md:text-5xl">
            <DecryptedText key={s.id} text={s.title} duration={700} />
          </h3>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                key={`bar-${s.id}`}
                className="h-full origin-left rounded-full bg-gradient-to-r from-[var(--xeno-b)] to-[var(--xeno-a)] animate-[meter_1.2s_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{ width: `${s.credibilityScore}%` }}
              />
            </div>
            <span className="font-mono text-sm text-[var(--xeno-a)]">{s.credibilityScore}%</span>
          </div>
          <p className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">
            <span>Credibility index · {s.isGovDeclassified ? 'gov declassified' : 'citizen report'}</span>
            <span className="flex items-center gap-1 text-white/60 transition group-hover:text-[var(--xeno-a)]">
              Case file <ArrowUpRight size={11} />
            </span>
          </p>
        </div>
      </Link>

      {/* Queue */}
      <ul className="flex flex-col gap-2">
        {top.map((t, k) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => {
                setI(k);
                setPaused(true);
                xenoAudio?.blip(k / top.length);
              }}
              className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition ${
                k === i % top.length
                  ? 'border-[var(--xeno-a)]/50 bg-[var(--xeno-a)]/10'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/15'
              }`}
            >
              <span className="font-mono text-[10px] text-white/30">{String(k + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/85">{t.title}</span>
              <span className="font-mono text-[10px] text-[var(--xeno-a)]">{t.credibilityScore}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
