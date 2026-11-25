'use client';

/**
 * src/components/ui/MatrixDock.tsx
 * ---------------------------------------------------------------------------
 * Floating control cluster for /matrix: autopilot tour, soundtrack toggle and
 * the keyboard-shortcut help sheet. Pure presentation, state lives in the
 * page (see useMatrixHotkeys there).
 * ---------------------------------------------------------------------------
 */

import { Flame, Keyboard, LocateFixed, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Dialog } from '@/components/primitives/dialog';
import { Tooltip, TooltipProvider } from '@/components/primitives/tooltip';

export const SHORTCUTS: ReadonlyArray<[keys: string, action: string]> = [
  ['J  /  →', 'Next contact'],
  ['K  /  ←', 'Previous contact'],
  ['Esc', 'Close dossier / overlay'],
  ['/  or  ⌘K', 'Search all contacts'],
  ['1  2  3', 'All · Declassified · Citizen'],
  ['[  /  ]', 'Timeline −/+ 5 years'],
  ['T', 'Autopilot tour on/off'],
  ['M', 'Soundtrack on/off'],
  ['N', 'Closest sighting to you'],
  ['H', 'Sighting heatmap on/off'],
  ['R', 'Report a sighting'],
  ['?', 'This help'],
];

interface MatrixDockProps {
  readonly touring: boolean;
  readonly onTour: () => void;
  readonly soundOn: boolean;
  readonly onSound: () => void;
  readonly helpOpen: boolean;
  readonly onHelp: (open: boolean) => void;
  readonly onNearMe: () => void;
  readonly heatmap: boolean;
  readonly onHeatmap: () => void;
}

export default function MatrixDock({ touring, onTour, soundOn, onSound, helpOpen, onHelp, onNearMe, heatmap, onHeatmap }: MatrixDockProps) {
  return (
    <>
      <TooltipProvider>
        <div className="xeno-glass pointer-events-auto flex items-center gap-1 p-1">
          <Tooltip label={touring ? 'Stop autopilot (T)' : 'Autopilot tour (T)'}>
            <button
              type="button"
              onClick={onTour}
              aria-pressed={touring}
              className={`flex items-center gap-1.5 rounded-[14px] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                touring ? 'bg-[var(--xeno-a)] text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {touring ? <Pause size={12} /> : <Play size={12} />}
              <span className="hidden sm:inline">{touring ? 'Touring' : 'Tour'}</span>
            </button>
          </Tooltip>
          <Tooltip label="Sighting heatmap (H)">
            <button
              type="button"
              onClick={onHeatmap}
              aria-pressed={heatmap}
              aria-label="Toggle sighting heatmap"
              className={`rounded-[14px] px-2.5 py-1.5 transition ${heatmap ? 'text-[var(--xeno-d)]' : 'text-white/60 hover:text-white'}`}
            >
              <Flame size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Closest sighting to you (N)">
            <button
              type="button"
              onClick={onNearMe}
              aria-label="Find the sighting closest to me"
              className="flex items-center gap-1.5 rounded-[14px] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60 transition hover:text-white"
            >
              <LocateFixed size={13} /> <span className="hidden sm:inline">Near me</span>
            </button>
          </Tooltip>
          <Tooltip label={soundOn ? 'Mute (M)' : 'Soundtrack (M)'}>
            <button
              type="button"
              onClick={onSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Mute soundtrack' : 'Play soundtrack'}
              className={`rounded-[14px] px-2.5 py-1.5 transition ${soundOn ? 'text-[var(--xeno-a)]' : 'text-white/60 hover:text-white'}`}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </Tooltip>
          <Tooltip label="Keyboard shortcuts (?)">
            <button
              type="button"
              onClick={() => onHelp(true)}
              aria-label="Keyboard shortcuts"
              className="hidden rounded-[14px] px-2.5 py-1.5 text-white/60 transition hover:text-white md:block"
            >
              <Keyboard size={14} />
            </button>
          </Tooltip>
        </div>
      </TooltipProvider>

      {helpOpen && (
        <Dialog title="Keyboard shortcuts" onClose={() => onHelp(false)} className="p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">Flight controls</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold">Keyboard shortcuts</h2>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5">
            {SHORTCUTS.map(([k, a]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-[var(--xeno-a)]">
                    {k}
                  </kbd>
                </dt>
                <dd className="text-sm text-white/70">{a}</dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
    </>
  );
}
