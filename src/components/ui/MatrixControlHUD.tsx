'use client';

/**
 * src/components/ui/MatrixControlHUD.tsx
 * Top recon bar: status, feed-tab filter (all / FOIA / citizen), node count, intake.
 */

import { UploadCloud } from 'lucide-react';

export type FeedTab = 'all' | 'verified' | 'citizen';

interface MatrixControlHUDProps {
  readonly activeFeedTab: FeedTab;
  readonly onTabChange: (tab: FeedTab) => void;
  readonly nodeCount: number;
  readonly totalCount: number;
  readonly loading: boolean;
  readonly onSubmit: () => void;
}

const TABS: ReadonlyArray<{ id: FeedTab; label: string }> = [
  { id: 'all', label: '🌐 All Signals' },
  { id: 'verified', label: '🏛️ FOIA Docs' },
  { id: 'citizen', label: '📡 Citizen Ops' },
];

export default function MatrixControlHUD({
  activeFeedTab,
  onTabChange,
  nodeCount,
  totalCount,
  loading,
  onSubmit,
}: MatrixControlHUDProps) {
  return (
    <header className="flex flex-col items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-900/40 px-4 py-2.5 backdrop-blur-md md:flex-row">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${loading ? 'bg-amber-500' : 'animate-ping bg-emerald-500'}`}
        />
        <div>
          <h1 className="font-mono text-base font-bold tracking-wider text-zinc-100">
            MATRIX_SOCIAL_NETWORK <span className="text-zinc-600">{'//'}</span>{' '}
            <span className="text-emerald-400">RECON_HUD</span>
          </h1>
          <p className="font-mono text-[10px] text-zinc-500">
            Continuous PostGIS synchronization &amp; AI analytics core
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1 font-mono text-[11px]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-md px-3 py-1.5 transition ${
                activeFeedTab === tab.id
                  ? 'border border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="hidden text-right font-mono text-[11px] sm:block">
          <span className="block text-zinc-500">MAP DATA</span>
          <span className="font-bold text-emerald-400">
            {nodeCount} / {totalCount}
          </span>
        </div>
        <button
          onClick={onSubmit}
          className="flex items-center gap-2 rounded-md border border-cyan-700 bg-cyan-600/10 px-3 py-1.5 font-mono text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-600/20"
        >
          <UploadCloud size={14} /> SUBMIT
        </button>
      </div>
    </header>
  );
}
