'use client';

import { useState } from 'react';
import { EGGS, useFoundEggs } from './eggs';

/** Floating "secrets found" badge with a hint list. */
export default function EggHunt() {
  const found = useFoundEggs();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 left-4 z-40 md:bottom-6 md:left-6">
      {open && (
        <div className="xeno-glass absolute bottom-12 left-0 w-[min(84vw,340px)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Secrets · {found.length}/{EGGS.length}</p>
          <ul className="mt-3 max-h-[50svh] space-y-3 overflow-y-auto pr-1">
            {EGGS.map((e) => {
              const got = found.includes(e.id);
              return (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span aria-hidden className="pt-0.5">{got ? '🛸' : '🥚'}</span>
                  <span>
                    <span className={`block font-semibold ${got ? 'text-[var(--xeno-a)]' : 'text-white/80'}`}>{got ? e.name : '???'}</span>
                    <span className="block text-xs leading-relaxed text-white/50">{e.hint}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="xeno-btn !px-3"
        data-cursor="HINTS"
      >
        🥚 {found.length}/{EGGS.length}
        <span className="hidden sm:inline">secrets</span>
      </button>
    </div>
  );
}
