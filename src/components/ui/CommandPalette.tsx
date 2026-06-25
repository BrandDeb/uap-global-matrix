'use client';

/**
 * src/components/ui/CommandPalette.tsx
 * ---------------------------------------------------------------------------
 * ⌘K command palette: search across all loaded sightings by title / location,
 * with quick filters (gov-only + evidence type). Selecting a result opens its
 * dossier — and the globe orients to it via the existing focus path.
 *
 * Mounted only while open (fresh state each time); the active row is reset in
 * the change handlers (not effects).
 * ---------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { LiveSighting } from '@/lib/sightings';
import { SENSOR_EVIDENCE_TYPES, type SensorEvidenceType } from '@/types';

interface CommandPaletteProps {
  readonly sightings: readonly LiveSighting[];
  readonly onClose: () => void;
  readonly onSelect: (id: string) => void;
}

const RESULT_CAP = 40;

function chipClass(active: boolean): string {
  return `rounded border px-2 py-0.5 transition ${
    active
      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
      : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
  }`;
}

export default function CommandPalette({ sightings, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [evidence, setEvidence] = useState<SensorEvidenceType | null>(null);
  const [govOnly, setGovOnly] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const activeIdx = Math.min(active, Math.max(0, results.length - 1));

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIdx];
      if (r) choose(r.id);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3">
          <Search size={16} className="text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search sightings by title or location…"
            className="w-full bg-transparent py-3 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800/60 px-3 py-2 font-mono text-[10px]">
          <button
            onClick={() => {
              setGovOnly((v) => !v);
              setActive(0);
            }}
            className={chipClass(govOnly)}
          >
            🏛️ GOV
          </button>
          {SENSOR_EVIDENCE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                setEvidence((cur) => (cur === t ? null : t));
                setActive(0);
              }}
              className={chipClass(evidence === t)}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-xs text-zinc-600">
              No matching contacts.
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r.id)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition ${
                  i === activeIdx ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs font-bold text-zinc-200">{r.title}</div>
                  <div className="truncate text-[10px] text-zinc-500">
                    {r.locationName} · {new Date(r.eventTimestamp).getUTCFullYear()}
                  </div>
                </div>
                <span
                  className={`shrink-0 font-mono text-[10px] ${
                    r.isGovDeclassified ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {r.credibilityScore}%
                </span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-zinc-800/60 px-3 py-1.5 font-mono text-[9px] text-zinc-600">
          ↑↓ navigate · ↵ open · esc close · {results.length} hits
        </div>
      </div>
    </div>
  );
}
