'use client';

/**
 * src/components/ui/XenoIntro.tsx
 * Boot sequence overlay: a counting "signal lock" percentage and staggered
 * wordmark reveal, then a shutter wipe that hands off to the globe.
 */

import { useEffect, useState } from 'react';

const LINES = ['Calibrating deep-field array', 'Decrypting FOIA archive', 'Triangulating contacts'];

export default function XenoIntro() {
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Timer-driven (not rAF) so a busy WebGL first frame can't stall the boot.
    const start = Date.now();
    const id = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 2200);
      setPct(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t >= 1) window.clearInterval(id);
    }, 40);
    const done = window.setTimeout(() => setGone(true), 2600);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(done);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-[var(--xeno-void)] p-8 transition-[clip-path] duration-[1200ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        gone ? 'pointer-events-none [clip-path:inset(0_0_100%_0)]' : '[clip-path:inset(0_0_0_0)]'
      }`}
    >
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
        <span>UAP/MATRIX</span>
        <span>Est. 1947 — Signal open</span>
      </div>

      <div className="overflow-hidden">
        <h1 className="xeno-rise font-[family-name:var(--font-display)] text-[13vw] font-extrabold leading-[0.85] tracking-tight text-white">
          WE ARE
        </h1>
        <h1
          className="xeno-rise xeno-gradient-text font-[family-name:var(--font-display)] text-[13vw] font-extrabold leading-[0.85] tracking-tight"
          style={{ animationDelay: '0.12s' }}
        >
          NOT ALONE
        </h1>
      </div>

      <div className="flex items-end justify-between">
        <ul className="space-y-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
          {LINES.map((l, i) => (
            <li key={l} className="xeno-fade" style={{ animationDelay: `${0.3 + i * 0.35}s` }}>
              <span className="text-[var(--xeno-a)]">▸</span> {l}
            </li>
          ))}
        </ul>
        <span className="font-[family-name:var(--font-display)] text-7xl font-light tabular-nums text-[var(--xeno-a)]">
          {String(pct).padStart(3, '0')}
          <span className="text-2xl text-white/40">%</span>
        </span>
      </div>
    </div>
  );
}
