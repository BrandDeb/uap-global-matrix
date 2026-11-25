'use client';

/**
 * src/components/ui/XenoIntro.tsx
 * Boot sequence overlay: a counting "signal lock" percentage and staggered
 * wordmark reveal, then a shutter wipe that hands off to the globe and
 * unmounts cleanly from the DOM. Runs once per browser tab session and can be
 * skipped immediately via click or Esc/Space/Enter.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(useGSAP, SplitText, ScrambleTextPlugin);

const LINES = ['Calibrating deep-field array', 'Decrypting FOIA archive', 'Triangulating contacts'];
const SESSION_KEY = 'uap_intro_seen';
const emptySubscribe = () => () => {};

function getAlreadySeenSnapshot(): boolean {
  try {
    return (
      window.sessionStorage.getItem(SESSION_KEY) === '1' ||
      new URLSearchParams(window.location.search).has('case')
    );
  } catch {
    return false;
  }
}

export default function XenoIntro() {
  const skippedFromSession = useSyncExternalStore(emptySubscribe, getAlreadySeenSnapshot, () => true);
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);
  const [unmounted, setUnmount] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const active = !skippedFromSession && !unmounted;

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* private mode */
    }
    setPct(100);
    setGone(true);
  }, []);

  useEffect(() => {
    if (!active) return;

    const start = Date.now();
    const id = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 1600);
      setPct(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t >= 1) window.clearInterval(id);
    }, 35);
    const done = window.setTimeout(dismiss, 1850);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') dismiss();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(done);
      window.removeEventListener('keydown', onKey);
    };
  }, [active, dismiss]);

  // Remove the fixed layer from the DOM completely once the shutter wipe finishes.
  useEffect(() => {
    if (!gone) return;
    const t = window.setTimeout(() => setUnmount(true), 950);
    return () => window.clearTimeout(t);
  }, [gone]);

  useGSAP(
    () => {
      if (!active || !root.current) return;
      const split = SplitText.create('.xeno-intro-h', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, {
        yPercent: 120,
        rotate: 8,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.028,
      });
      gsap.utils.toArray<HTMLElement>('.xeno-intro-line').forEach((el, i) => {
        gsap.from(el, {
          duration: 0.85,
          delay: 0.2 + i * 0.22,
          opacity: 0,
          scrambleText: { text: el.textContent ?? '', chars: 'ΞΨΔΣΩ01<>/', speed: 0.6 },
        });
      });
      return () => split.revert();
    },
    { scope: root, dependencies: [active] },
  );

  if (!active) return null;

  return (
    <div
      ref={root}
      onClick={dismiss}
      aria-hidden
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col justify-between bg-[var(--xeno-void)] p-8 transition-[clip-path,opacity] duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        gone ? 'pointer-events-none opacity-0 [clip-path:inset(0_0_100%_0)]' : '[clip-path:inset(0_0_0_0)]'
      }`}
    >
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
        <span>UAP/MATRIX</span>
        <span>Est. 1947, Click or ESC to skip</span>
      </div>

      <div className="overflow-hidden">
        <h1 className="xeno-intro-h font-[family-name:var(--font-display)] text-[12vw] font-extrabold leading-[0.96] tracking-tight text-white">
          WE ARE
        </h1>
        <h1 className="xeno-intro-h font-[family-name:var(--font-display)] text-[12vw] font-extrabold leading-[0.96] tracking-tight text-[var(--xeno-a)]">
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
