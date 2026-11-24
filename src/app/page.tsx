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
import IntelAnalytics from '@/components/ui/IntelAnalytics';
import { computeAnalytics } from '@/lib/analytics';
import XenoIntro from '@/components/ui/XenoIntro';
import { AnimatePresence, motion } from 'motion/react';

const MAX_YEAR = 2026;

export default function GlobalMatrixDashboard() {
  const { sightings, hotspots, loading, postIntelMessage } = useSocialMatrix();
  const { caseData, fetchCaseFile, clearCaseFile } = useLazyCaseFile();
  const [selectedYear, setSelectedYear] = useState(MAX_YEAR);
  const [feedTab, setFeedTab] = useState<FeedTab>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

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

  // Deep link: ?case=<id> opens that dossier on load.
  useEffect(() => {
    const caseId = new URLSearchParams(window.location.search).get('case');
    if (caseId) fetchCaseFile(caseId);
  }, [fetchCaseFile]);

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

  const analytics = useMemo(() => computeAnalytics(sightings), [sightings]);

  return (
    <main className="fixed inset-0 select-none overflow-hidden bg-[var(--xeno-void)] text-zinc-200">
      <XenoIntro />

      {/* Full-bleed WebGL stage */}
      <GlobeOverlay
        points={filtered}
        activeCount={filtered.length}
        hotspots={hotspots}
        focusPoint={caseData ? { latitude: caseData.latitude, longitude: caseData.longitude } : null}
        pingPoint={
          sightings[0] ? { latitude: sightings[0].latitude, longitude: sightings[0].longitude } : null
        }
        onSelect={(id) => fetchCaseFile(id)}
      />

      {/* Giant editorial backdrop type */}
      <div className="pointer-events-none absolute inset-x-0 top-[14vh] z-0 text-center mix-blend-screen">
        <p className="font-mono text-[10px] uppercase tracking-[0.6em] text-white/40">
          Unidentified anomalous phenomena · 1947 — {MAX_YEAR}
        </p>
      </div>
      <div
        className={`pointer-events-none absolute bottom-[22vh] left-6 z-0 hidden max-w-sm transition-opacity duration-700 lg:block ${
          caseData ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <h2 className="font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[0.9] text-white/90">
          The sky<br />
          <span className="xeno-gradient-text">is talking.</span>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/45">
          {sightings.length.toLocaleString()} contacts triangulated across the planet. Drag to orbit, scroll to
          descend, tap a pillar to open its dossier.
        </p>
      </div>

      {/* HUD layer */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4 md:p-6">
        <MatrixControlHUD
          activeFeedTab={feedTab}
          onTabChange={setFeedTab}
          nodeCount={filtered.length}
          totalCount={sightings.length}
          loading={loading}
          onSearch={() => setPaletteOpen(true)}
          onStats={() => setStatsOpen(true)}
          onSubmit={() => setModalOpen(true)}
        />

        <div className="flex min-h-0 flex-1 justify-between gap-4 py-4">
          {/* Right-side transmission rail (left when a dossier is open) */}
          <motion.aside
            layout
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={`pointer-events-auto hidden w-72 shrink-0 flex-col gap-3 md:flex ${
              caseData ? 'order-first' : 'order-last'
            }`}
          >
            <section className="xeno-glass p-4">
              <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.3em]">
                <span className="flex items-center gap-1.5 text-[var(--xeno-d)]">
                  <ShieldAlert size={11} /> Flap clusters
                </span>
                <span className="text-white/30">{hotspots.length}</span>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {hotspots.length === 0 ? (
                  <p className="py-3 text-center font-mono text-[10px] text-white/30">
                    Listening for multi-point flaps…
                  </p>
                ) : (
                  hotspots.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-white/80">{h.locationName}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[8px] tracking-widest ${
                          h.severityLevel === 'CRITICAL_FLAP'
                            ? 'bg-[var(--xeno-d)]/15 text-[var(--xeno-d)]'
                            : 'bg-[var(--xeno-b)]/15 text-[var(--xeno-b)]'
                        }`}
                      >
                        {h.sightingCount} · {h.severityLevel === 'CRITICAL_FLAP' ? 'CRIT' : 'ELEV'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="xeno-glass flex min-h-0 flex-1 flex-col p-4">
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--xeno-a)]">
                <Radio size={11} className="animate-pulse" /> Incoming transmissions
              </div>
              <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
                {filtered.slice(0, 24).map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => fetchCaseFile(s.id)}
                    className="group block w-full rounded-xl px-2 py-2 text-left transition-colors duration-300 hover:bg-white/5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[9px] text-white/25">{String(i + 1).padStart(2, '0')}</span>
                      <h4 className="min-w-0 flex-1 truncate text-[13px] text-white/85 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white">
                        {s.title}
                      </h4>
                      <span className="font-mono text-[9px] text-[var(--xeno-a)]">{s.credibilityScore}%</span>
                    </div>
                    <p className="ml-6 truncate font-mono text-[9px] uppercase tracking-wider text-white/35">
                      {s.locationName} · {new Date(s.eventTimestamp).getUTCFullYear()}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </motion.aside>

          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-auto absolute inset-y-0 right-0">
              <AnimatePresence mode="wait">
                {caseData && (
                  <motion.div
                    key={caseData.id}
                    className="h-full"
                    initial={{ opacity: 0, x: 40, filter: 'blur(12px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: 40, filter: 'blur(12px)' }}
                    transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                  >
                    <CaseDossier sighting={caseData} onClose={clearCaseFile} onAddIntel={postIntelMessage} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <TimelineScrubber
          minYear={1947}
          maxYear={MAX_YEAR}
          currentYear={selectedYear}
          decades={analytics.decades}
          maxDecadeCount={analytics.maxDecadeCount}
          onYearChange={(year) => {
            setSelectedYear(year);
            if (caseData && new Date(caseData.eventTimestamp).getUTCFullYear() > year) {
              clearCaseFile();
            }
          }}
        />
      </div>

      {/* Marquee ticker */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden py-1 opacity-40">
        <div className="xeno-marquee font-mono text-[9px] uppercase tracking-[0.4em] text-white/40">
          {[0, 1].map((k) => (
            <span key={k} className="flex shrink-0 gap-10 pr-10">
              {sightings.slice(0, 16).map((s) => (
                <span key={s.id + k}>◈ {s.locationName}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {modalOpen && <SubmissionModal onClose={() => setModalOpen(false)} />}

      {paletteOpen && (
        <CommandPalette
          sightings={sightings}
          onClose={() => setPaletteOpen(false)}
          onSelect={(id) => fetchCaseFile(id)}
        />
      )}

      {statsOpen && <IntelAnalytics data={analytics} onClose={() => setStatsOpen(false)} />}
    </main>
  );
}
