'use client';

/**
 * src/components/ui/CommandPalette.tsx
 * ---------------------------------------------------------------------------
 * ⌘K command palette: search across all loaded sightings by title / location,
 * with quick filters (gov-only + evidence type). Selecting a result opens its
 * dossier — and the globe orients to it via the existing focus path.
 *
 * Built on cmdk (keyboard nav, active row, a11y) inside a Radix dialog (focus
 * trap, Esc). Filtering/ranking stays ours, so cmdk's filter is disabled.
 * ---------------------------------------------------------------------------
 */

import { useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { Dialog } from '@/components/primitives/dialog';
import type { LiveSighting } from '@/lib/sightings';
import { SENSOR_EVIDENCE_TYPES, type SensorEvidenceType } from '@/types';

interface CommandPaletteProps {
  readonly sightings: readonly LiveSighting[];
  readonly onClose: () => void;
  readonly onSelect: (id: string) => void;
}

const RESULT_CAP = 40;

function chipClass(active: boolean): string {
  return `rounded-full border px-2.5 py-0.5 uppercase tracking-wider transition ${
    active
      ? 'border-[var(--xeno-a)]/50 bg-[var(--xeno-a)]/10 text-[var(--xeno-a)]'
      : 'border-white/10 text-white/40 hover:text-white/80'
  }`;
}

export default function CommandPalette({ sightings, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [evidence, setEvidence] = useState<SensorEvidenceType | null>(null);
  const [govOnly, setGovOnly] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sightings.filter((s) => {
      if (govOnly && !s.isGovDeclassified) return false;
      if (evidence && !s.evidenceTypes.includes(evidence)) return false;
      if (q && !`${s.title} ${s.locationName}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) => {
      if (q) {
        const aStarts = a.title.toLowerCase().startsWith(q) ? 1 : 0;
        const bStarts = b.title.toLowerCase().startsWith(q) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
      }
      return b.credibilityScore - a.credibilityScore;
    });
    return list.slice(0, RESULT_CAP);
  }, [query, evidence, govOnly, sightings]);

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Dialog title="Search sightings" onClose={onClose}>
      <Command shouldFilter={false} loop label="Search sightings">
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search size={16} className="text-[var(--xeno-a)]" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search contacts by title or location…"
            className="w-full bg-transparent py-4 text-base text-white placeholder:text-white/30 focus:outline-none"
          />
          <kbd className="font-mono text-[9px] text-white/30">ESC</kbd>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 px-4 py-2.5 font-mono text-[9px]">
          <button onClick={() => setGovOnly((v) => !v)} className={chipClass(govOnly)}>
            Declassified
          </button>
          {SENSOR_EVIDENCE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setEvidence((cur) => (cur === t ? null : t))}
              className={chipClass(evidence === t)}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <Command.List className="max-h-[50vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-10 text-center font-mono text-xs text-white/30">
            No matching contacts.
          </Command.Empty>
          {results.map((r) => (
            <Command.Item
              key={r.id}
              value={r.id}
              onSelect={() => choose(r.id)}
              className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors data-[selected=true]:bg-white/[0.06]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-white/85 group-data-[selected=true]:text-white">{r.title}</div>
                <div className="truncate font-mono text-[9px] uppercase tracking-wider text-white/35">
                  {r.locationName} · {new Date(r.eventTimestamp).getUTCFullYear()}
                </div>
              </div>
              <span
                className={`shrink-0 font-mono text-[10px] ${
                  r.isGovDeclassified ? 'text-[var(--xeno-b)]' : 'text-[var(--xeno-a)]'
                }`}
              >
                {r.credibilityScore}%
              </span>
            </Command.Item>
          ))}
        </Command.List>

        <div className="border-t border-white/5 px-4 py-2 font-mono text-[9px] tracking-widest text-white/30">
          ↑↓ NAVIGATE · ↵ OPEN · ESC CLOSE · {results.length} HITS
        </div>
      </Command>
    </Dialog>
  );
}
