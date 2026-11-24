'use client';

/**
 * src/components/ui/XenoIntro.tsx
 * Boot sequence overlay: a counting "signal lock" percentage and staggered
 * wordmark reveal, then a shutter wipe that hands off to the globe.
 */

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(useGSAP, SplitText, ScrambleTextPlugin);

const LINES = ['Calibrating deep-field array', 'Decrypting FOIA archive', 'Triangulating contacts'];

export default function XenoIntro() {
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // GSAP: per-character rise for the headline, scrambled decode for status lines.
  useGSAP(
    () => {
      const split = SplitText.create('.xeno-intro-h', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, {
        yPercent: 120,
        rotate: 8,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.035,
      });
      gsap.utils.toArray<HTMLElement>('.xeno-intro-line').forEach((el, i) => {
        gsap.from(el, {
          duration: 1,
          delay: 0.3 + i * 0.3,
          opacity: 0,
          scrambleText: { text: el.textContent ?? '', chars: 'ΞΨΔΣΩ01<>/', speed: 0.6 },
        });
      });
      return () => split.revert();
    },
    { scope: root },
  );

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
      ref={root}
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
        <h1 className="xeno-intro-h font-[family-name:var(--font-display)] text-[13vw] font-extrabold leading-[0.85] tracking-tight text-white">
          WE ARE
        </h1>
        <h1
          className="xeno-intro-h font-[family-name:var(--font-display)] text-[13vw] font-extrabold leading-[0.85] tracking-tight text-[var(--xeno-a)]"
        >
          NOT ALONE
        </h1>
      </div>

      <div className="flex items-end justify-between">
        <ul className="space-y-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
          {LINES.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="text-[var(--xeno-a)]">▸</span>
              <span className="xeno-intro-line">{l}</span>
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
