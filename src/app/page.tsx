'use client';

/**
 * src/app/page.tsx
 * ---------------------------------------------------------------------------
 * UAP Global Matrix — social OSINT command console.
 *
 *   HUD (status · feed tabs · node count · submit)
 *   ├ left: hotspot flaps + operator incident stream
 *   ├ center: 3D globe (click → dossier + AI brief + thread + co-witness)
 *   └ bottom: timeline scrubber (year filter)
 *
 * Data: `useSocialMatrix` (paginated sightings + hotspots + realtime). The feed
 * tab filters gov-declassified vs citizen; the timeline filters by year.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, Radio } from 'lucide-react';
import { useSocialMatrix } from '@/hooks/useSocialMatrix';
import { useLazyCaseFile } from '@/hooks/useLazyCaseFile';
import GlobeOverlay from '@/components/map/GlobeOverlay';
import CaseDossier from '@/components/ui/CaseDossier';
import TimelineScrubber from '@/components/ui/TimelineScrubber';
import SubmissionModal from '@/components/ui/SubmissionModal';
import MatrixControlHUD, { type FeedTab } from '@/components/ui/MatrixControlHUD';
import CommandPalette from '@/components/ui/CommandPalette';

const MAX_YEAR = 2026;

export default function GlobalMatrixDashboard() {
  const { sightings, hotspots, loading, postIntelMessage } = useSocialMatrix();
  const { caseData, fetchCaseFile, clearCaseFile } = useLazyCaseFile();
  const [selectedYear, setSelectedYear] = useState(MAX_YEAR);
  const [feedTab, setFeedTab] = useState<FeedTab>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(
    () =>
      sightings.filter((s) => {
        if (new Date(s.eventTimestamp).getUTCFullYear() > selectedYear) return false;
        if (feedTab === 'verified') return s.isGovDeclassified;
        if (feedTab === 'citizen') return !s.isGovDeclassified;
        return true;
      }),
    [sightings, selectedYear, feedTab],
  );

  return (
    <main className="flex h-screen w-screen select-none flex-col space-y-3 overflow-hidden bg-zinc-950 p-3 text-zinc-200">
      <MatrixControlHUD
        activeFeedTab={feedTab}
        onTabChange={setFeedTab}
        nodeCount={filtered.length}
        totalCount={sightings.length}
        loading={loading}
        onSearch={() => setPaletteOpen(true)}
        onSubmit={() => setModalOpen(true)}
      />

      <div className="flex min-h-0 flex-1 space-x-3 overflow-hidden">
        {/* Left rail */}
        <div className="flex w-80 shrink-0 flex-col space-y-3">
          {/* Hotspot flaps */}
          <div className="flex min-h-[160px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold text-amber-500">
              <ShieldAlert size={13} />
              <span>AUTOMATED RADIAL FLAPS</span>
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
                    className="flex flex-col gap-1 rounded border border-zinc-800/60 bg-zinc-950/40 p-2"
                  >
                    <div className="flex justify-between font-bold">
                      <span className="max-w-[150px] truncate text-zinc-300">{h.locationName}</span>
                      <span
                        className={`rounded border px-1 text-[8px] ${
                          h.severityLevel === 'CRITICAL_FLAP'
                            ? 'border-red-500/20 bg-red-500/10 text-red-400'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {h.severityLevel}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>CONCURRENT NODES: {h.sightingCount}</span>
                      <span>LIVE SYNC</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Incident stream */}
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-400">
              <Radio size={13} className="animate-pulse text-emerald-500" />
              <span>OPERATOR INCIDENT STREAM</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {filtered.slice(0, 20).map((s) => (
                <button
                  key={s.id}
                  onClick={() => fetchCaseFile(s.id)}
                  className="block w-full rounded-lg border border-zinc-900 bg-zinc-950/30 p-2 text-left transition hover:border-zinc-700/60"
                >
                  <div className="mb-1 flex justify-between font-mono text-[8px] text-zinc-500">
                    <span>{new Date(s.eventTimestamp).toLocaleDateString()}</span>
                    <span className="text-emerald-400">INDEX: {s.credibilityScore}%</span>
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
            hotspots={hotspots}
            focusPoint={
              caseData ? { latitude: caseData.latitude, longitude: caseData.longitude } : null
            }
            pingPoint={
              sightings[0]
                ? { latitude: sightings[0].latitude, longitude: sightings[0].longitude }
                : null
            }
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

      {paletteOpen && (
        <CommandPalette
          sightings={sightings}
          onClose={() => setPaletteOpen(false)}
          onSelect={(id) => fetchCaseFile(id)}
        />
      )}
    </main>
  );
}
