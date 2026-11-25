'use client';

/**
 * src/components/profile/Onboarding.tsx
 * Three quick, skippable steps on first visit to the globe:
 *   1. Who are you?  — pilot name + alien
 *   2. Three ways in — Globe / Files / Arcade (one line each)
 *   3. Make it yours — theme + optional location for "Near me"
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import AlienAvatar from './AlienAvatar';
import { AvatarPicker, LocationPermission, NameField, ThemePicker } from './Pickers';
import { saveProfile, useLocalProfile } from '@/lib/profile';

const WAYS = [
  { emoji: '🌍', title: 'The Globe', body: 'Every contact plotted where it happened. Drag, zoom, tap a pillar. Press ? for shortcuts.', href: '/matrix' },
  { emoji: '🗂️', title: 'The Files', body: '84 years of declassified cases. Tap a file to lift the redactions.', href: '/archive' },
  { emoji: '🕹️', title: 'The Arcade', body: 'Abduct cows, recycle space junk, feed a black hole. Leaderboards reset Mondays.', href: '/arcade' },
];

export default function Onboarding() {
  const p = useLocalProfile();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  // Wait for the boot intro to finish before saying hello.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2900);
    return () => window.clearTimeout(t);
  }, []);
  if (p.onboarded || !ready) return null;
  const done = () => saveProfile({ onboarded: true });

  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to UAP/MATRIX" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center">
      <div className="xeno-glass relative w-full max-w-lg overflow-hidden !bg-[#0a0816]/95 p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-[var(--xeno-a)]' : 'w-3 bg-white/15'}`} />
            ))}
          </div>
          <button type="button" onClick={done} className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
            Skip
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <>
                <div className="mb-4 flex items-center gap-4">
                  <AlienAvatar index={p.avatar} size={64} />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">Step 1 · identify yourself</p>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Welcome, pilot.</h2>
                  </div>
                </div>
                <NameField />
                <p className="mb-3 mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Pick your alien</p>
                <AvatarPicker count={10} />
              </>
            )}
            {step === 1 && (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">Step 2 · three ways in</p>
                <h2 className="mb-5 font-[family-name:var(--font-display)] text-2xl font-extrabold">Here’s the mothership.</h2>
                <div className="space-y-3">
                  {WAYS.map((w) => (
                    <Link
                      key={w.title}
                      href={w.href}
                      onClick={done}
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[var(--xeno-a)]/40"
                    >
                      <span className="text-3xl">{w.emoji}</span>
                      <span>
                        <span className="block font-[family-name:var(--font-display)] font-extrabold">{w.title}</span>
                        <span className="block text-sm text-white/55">{w.body}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">Step 3 · make it yours</p>
                <h2 className="mb-5 font-[family-name:var(--font-display)] text-2xl font-extrabold">Light, dark, or both?</h2>
                <ThemePicker />
                <div className="mt-6 border-t border-white/10 pt-5">
                  <LocationPermission />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`font-mono text-[11px] uppercase tracking-[0.25em] text-white/50 hover:text-white ${step === 0 ? 'invisible' : ''}`}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => (step < 2 ? setStep(step + 1) : done())}
            className="rounded-full bg-[var(--xeno-a)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-black transition hover:scale-105"
          >
            {step < 2 ? 'Next' : 'Launch 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
