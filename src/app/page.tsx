'use client';

/**
 * src/app/page.tsx
 * ---------------------------------------------------------------------------
 * UAP Global Matrix — tactical command dashboard.
 *
 *   ┌──────────────┬─────────────────────────────────────────┐
 *   │ Controls 25% │ 3D Globe (R3F Canvas) 75%                │
 *   │  · search    │   · Night-Earth textured globe (r=2)     │
 *   │  · date band │   · InstancedMesh sighting markers       │
 *   │  · intake    │     coloured by credibility              │
 *   └──────────────┴─────────────────────────────────────────┘
 *
 * Data: `useLiveSightings` loads the archive + subscribes to realtime INSERTs,
 * so new sightings appear without a refresh. Filter state flows one way →
 * `filtered` → <GlobeOverlay>; clicking a marker opens the <CaseDossier>.
 * ---------------------------------------------------------------------------
 */

import { useMemo, useState } from 'react';
import { Radar, Search, SlidersHorizontal, UploadCloud, X } from 'lucide-react';
import GlobeOverlay from '@/components/map/GlobeOverlay';
import CaseDossier from '@/components/ui/CaseDossier';
import { useLiveSightings, type LiveSighting } from '@/hooks/useLiveSightings';

/* ===========================================================================
 * Filtering
 * ======================================================================== */

interface Filters {
  readonly query: string;
  readonly minCredibility: number;
  readonly startDate: string; // yyyy-mm-dd or ''
  readonly endDate: string; // yyyy-mm-dd or ''
}

function applyFilters(
  sightings: readonly LiveSighting[],
  filters: Filters,
): LiveSighting[] {
  const q = filters.query.trim().toLowerCase();
  const startMs = filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`).getTime() : -Infinity;
  const endMs = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`).getTime() : Infinity;

  return sightings.filter((s) => {
    if (s.credibilityScore < filters.minCredibility) return false;
    const t = new Date(s.eventTimestamp).getTime();
    if (t < startMs || t > endMs) return false;
    if (q && !`${s.title} ${s.locationName}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/* ===========================================================================
 * Drag-and-drop submission modal
 * ======================================================================== */

function SubmissionModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage('Attach an image or video first.');
      return;
    }
    const form = new FormData(event.currentTarget);
    form.set('file', file);
    const localTs = String(form.get('timestamp') ?? '');
    if (localTs) form.set('timestamp', new Date(localTs).toISOString());

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/verify', { method: 'POST', body: form });
      const body = (await res.json()) as {
        success: boolean;
        data?: { credibilityScore: number; sourceTier: string };
        error?: string;
      };
      if (body.success && body.data) {
        setMessage(`Logged. Credibility C=${body.data.credibilityScore} → ${body.data.sourceTier}.`);
        onSubmitted(); // refresh the globe behind the modal
      } else {
        setMessage(`Rejected: ${body.error ?? 'unknown error'}`);
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-cyan-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-widest text-cyan-400">
            <UploadCloud size={16} /> SUBMIT SIGHTING
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
            className={`flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-xs transition-colors ${
              dragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-zinc-700 bg-zinc-950'
            }`}
          >
            <UploadCloud size={22} className="mb-1 text-zinc-500" />
            <span className="text-zinc-400">
              {file ? file.name : 'Drag & drop image/video, or click to browse'}
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <input name="title" placeholder="Title" required className={inputClass} />
          <textarea name="description" placeholder="Description" rows={2} className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <input name="latitude" type="number" step="any" placeholder="Latitude" required className={inputClass} />
            <input name="longitude" type="number" step="any" placeholder="Longitude" required className={inputClass} />
          </div>
          <input name="location_name" placeholder="Location name (optional)" className={inputClass} />
          <input name="timestamp" type="datetime-local" required className={inputClass} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-cyan-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            {submitting ? 'Analyzing…' : 'Run Verification'}
          </button>
          {message && <p className="text-xs text-zinc-400">{message}</p>}
        </form>
      </div>
    </div>
  );
}

/* ===========================================================================
 * Page
 * ======================================================================== */

export default function Home() {
  const [filters, setFilters] = useState<Filters>({
    query: '',
    minCredibility: 0,
    startDate: '',
    endDate: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<LiveSighting | null>(null);

  // Live data: historical archive + realtime INSERTs (new sightings appear
  // without a refresh). Filtering stays client-side over the live set.
  const { sightings, loading } = useLiveSightings();
  const filtered = useMemo(() => applyFilters(sightings, filters), [sightings, filters]);

  const patch = (next: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...next }));

  const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500';
  const inputClass =
    'w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-cyan-500 focus:outline-none';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-200">
      {/* ── Left control rail (25%) ──────────────────────────────────── */}
      <aside className="flex w-1/4 min-w-[280px] flex-col border-r border-zinc-800 bg-zinc-900/40">
        <header className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
          <Radar size={20} className="text-cyan-400" />
          <div>
            <h1 className="text-sm font-bold tracking-widest text-zinc-100">UAP GLOBAL MATRIX</h1>
            <p className="text-[10px] tracking-wider text-zinc-500">TACTICAL SIGHTING LEDGER</p>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {/* Search */}
          <div>
            <label className={fieldLabel}>
              <Search size={11} className="mr-1 inline" /> Search
            </label>
            <input
              value={filters.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder="Title or location…"
              className={inputClass}
            />
          </div>

          {/* Credibility threshold */}
          <div>
            <label className={fieldLabel}>
              <SlidersHorizontal size={11} className="mr-1 inline" /> Min credibility · {filters.minCredibility}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={filters.minCredibility}
              onChange={(e) => patch({ minCredibility: Number(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Date timeline range */}
          <div>
            <label className={fieldLabel}>Event timeline</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
                className={inputClass}
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => patch({ endDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Intake */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-cyan-700 bg-cyan-600/10 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-600/20"
          >
            <UploadCloud size={15} /> Submit sighting
          </button>
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-[11px] text-zinc-500">
          <span>
            Showing <span className="font-semibold text-cyan-400">{filtered.length}</span> /{' '}
            {sightings.length} contacts
          </span>
          <span
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-widest ${
              loading ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                loading ? 'bg-amber-400' : 'animate-pulse bg-emerald-400'
              }`}
            />
            {loading ? 'SYNC' : 'LIVE'}
          </span>
        </footer>
      </aside>

      {/* ── Right globe viewport (75%) ───────────────────────────────── */}
      <main className="relative w-3/4 flex-1">
        <GlobeOverlay
          points={filtered}
          activeCount={filtered.length}
          onSelect={(id) => setSelected(sightings.find((s) => s.id === id) ?? null)}
        />
        {selected && <CaseDossier sighting={selected} onClose={() => setSelected(null)} />}
      </main>

      {modalOpen && (
        <SubmissionModal onClose={() => setModalOpen(false)} onSubmitted={() => {}} />
      )}
    </div>
  );
}
