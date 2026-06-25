'use client';

/**
 * src/app/page.tsx
 * ---------------------------------------------------------------------------
 * UAP Global Matrix — social intelligence command console.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ HUD  ·  live status  ·  node count  ·  [Submit]          │
 *   ├──────────────┬──────────────────────────────────────────┤
 *   │ Hotspots     │                                          │
 *   │ Community    │   3D globe (click → dossier + thread)     │
 *   │ ticker       │                                          │
 *   ├──────────────┴──────────────────────────────────────────┤
 *   │ Timeline scrubber (year filter)                         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Data comes from `useSocialMatrix` (sightings + hotspots + realtime). Clicking
 * a marker or ticker row lazily loads the case file into the <CaseDossier>.
 * ---------------------------------------------------------------------------
 */

import { useMemo, useState } from 'react';
import { ShieldAlert, Radio, UploadCloud } from 'lucide-react';
import { useSocialMatrix } from '@/hooks/useSocialMatrix';
import { useLazyCaseFile } from '@/hooks/useLazyCaseFile';
import GlobeOverlay from '@/components/map/GlobeOverlay';
import CaseDossier from '@/components/ui/CaseDossier';
import TimelineScrubber from '@/components/ui/TimelineScrubber';
import SubmissionModal from '@/components/ui/SubmissionModal';

const MAX_YEAR = 2026;

export default function GlobalMatrixDashboard() {
  const { sightings, hotspots, loading, postIntelMessage } = useSocialMatrix();
  const { caseData, fetchCaseFile, clearCaseFile } = useLazyCaseFile();
  const [selectedYear, setSelectedYear] = useState(MAX_YEAR);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () => sightings.filter((s) => new Date(s.eventTimestamp).getUTCFullYear() <= selectedYear),
    [sightings, selectedYear],
  );

  return (
    <main className="flex h-screen w-screen select-none flex-col space-y-3 overflow-hidden bg-zinc-950 p-3 text-zinc-200">
      {/* ── HUD ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-900/40 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${loading ? 'bg-amber-500' : 'animate-ping bg-emerald-500'}`}
          />
          <div>
            <h1 className="font-mono text-base font-bold tracking-wider text-zinc-100">
              MATRIX_SOCIAL_NETWORK <span className="text-zinc-600">{'//'}</span>{' '}
              <span className="text-emerald-400">{loading ? 'SYNCING' : 'LIVE_FEED'}</span>
            </h1>
            <p className="font-mono text-[10px] text-zinc-500">
              Continuous PostGIS clustering active &amp; syncing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right font-mono text-[11px]">
            <span className="block text-zinc-500">MAP DATA LEVEL</span>
            <span className="font-bold text-emerald-400">
              {filtered.length} / {sightings.length} NODES
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-md border border-cyan-700 bg-cyan-600/10 px-3 py-1.5 font-mono text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-600/20"
          >
            <UploadCloud size={14} /> SUBMIT
          </button>
        </div>
      </header>

      {/* ── Workspace ───────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 space-x-3 overflow-hidden">
        {/* Left rail: hotspots + community ticker */}
        <div className="flex w-80 shrink-0 flex-col space-y-3">
          {/* Hotspot deviations */}
          <div className="flex min-h-[180px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold text-amber-500">
              <ShieldAlert size={14} />
              <span>AUTOMATED HOTSPOT DEVIATIONS</span>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 font-mono text-[10px]">
              {hotspots.length === 0 ? (
                <div className="py-6 text-center italic text-zinc-600">
                  Monitoring for multi-point vector flaps…
                </div>
              ) : (
                hotspots.map((h) => (
                  <div
                    key={h.id}
                    className="flex flex-col space-y-1 rounded border border-zinc-800/60 bg-zinc-950/40 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="max-w-[150px] truncate font-bold text-zinc-300">
                        {h.locationName}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[9px] ${
                          h.severityLevel === 'CRITICAL_FLAP'
                            ? 'border-red-500/20 bg-red-500/10 text-red-400'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {h.severityLevel}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-500">
                      <span>CONCURRENT: {h.sightingCount}</span>
                      <span>ACTIVE</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Community ticker */}
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-400">
              <Radio size={14} className="animate-pulse text-emerald-500" />
              <span>COMMUNITY FEED CHRONICLE</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {filtered.slice(0, 20).map((s) => (
                <button
                  key={s.id}
                  onClick={() => fetchCaseFile(s.id)}
                  className="block w-full rounded-lg border border-zinc-900 bg-zinc-950/30 p-2 text-left transition hover:border-zinc-700/60"
                >
                  <div className="mb-1 flex justify-between font-mono text-[9px]">
                    <span className="text-zinc-500">
                      {new Date(s.eventTimestamp).toLocaleDateString()}
                    </span>
                    <span className="text-emerald-500">SCORE: {s.credibilityScore}%</span>
                  </div>
                  <h4 className="truncate font-mono text-xs font-bold text-zinc-300">{s.title}</h4>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-500">{s.locationName}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: globe + dossier */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-900 bg-zinc-950">
          <GlobeOverlay
            points={filtered}
            activeCount={filtered.length}
            onSelect={(id) => fetchCaseFile(id)}
          />
          <CaseDossier
            key={caseData?.id ?? 'none'}
            sighting={caseData}
            onClose={clearCaseFile}
            onAddIntel={postIntelMessage}
          />
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────────────────────── */}
      <TimelineScrubber
        minYear={1947}
        maxYear={MAX_YEAR}
        currentYear={selectedYear}
        onYearChange={(year) => {
          setSelectedYear(year);
          if (caseData && new Date(caseData.eventTimestamp).getUTCFullYear() > year) {
            clearCaseFile();
          }
        }}
      />

      {modalOpen && <SubmissionModal onClose={() => setModalOpen(false)} />}
    </main>
  );
}
