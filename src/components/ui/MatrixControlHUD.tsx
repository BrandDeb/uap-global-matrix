'use client';

/**
 * src/components/ui/MatrixControlHUD.tsx
 * Floating top bar: wordmark, signal-band tabs (all / FOIA / citizen), node
 * counter and actions. Sits over the full-bleed WebGL stage.
 */

import { UploadCloud, Radio, Search, Activity } from 'lucide-react';
import Link from 'next/link';
import NumberTicker from '@/components/fx/NumberTicker';
import UserChip from '@/components/ui/UserChip';
import { Tooltip, TooltipProvider } from '@/components/primitives/tooltip';

export type FeedTab = 'all' | 'verified' | 'citizen';

interface MatrixControlHUDProps {
  readonly activeFeedTab: FeedTab;
  readonly onTabChange: (tab: FeedTab) => void;
  readonly nodeCount: number;
  readonly totalCount: number;
  readonly loading: boolean;
  readonly onSearch: () => void;
  readonly onStats: () => void;
  readonly onSubmit: () => void;
}

const TABS: ReadonlyArray<{ id: FeedTab; label: string; idx: string }> = [
  { id: 'all', label: 'All Signals', idx: '01' },
  { id: 'verified', label: 'Declassified', idx: '02' },
  { id: 'citizen', label: 'Citizen Ops', idx: '03' },
];

export default function MatrixControlHUD({
  activeFeedTab,
  onTabChange,
  nodeCount,
  totalCount,
  loading,
  onSearch,
  onStats,
  onSubmit,
}: MatrixControlHUDProps) {
  return (
    <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex items-center gap-3">
        <div className="relative grid h-10 w-10 place-items-center">
          <span className="absolute inset-0 animate-[spin_9s_linear_infinite] rounded-full border border-dashed border-[var(--xeno-a)]/60" />
          <span className="absolute inset-2 animate-[spin_5s_linear_infinite_reverse] rounded-full border border-[var(--xeno-b)]/60 border-t-transparent" />
          <span
            className={`h-2 w-2 rounded-full ${loading ? 'bg-[var(--xeno-b)]' : 'bg-[var(--xeno-a)] shadow-[0_0_12px_var(--xeno-a)]'}`}
          />
        </div>
        <div className="leading-none">
          <p className="font-[family-name:var(--font-display)] text-sm font-medium tracking-[0.3em] text-white">
            UAP<span className="text-[var(--xeno-a)]">/</span>MATRIX
          </p>
          <p className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.35em] text-white/40 sm:block">
            Xeno signal atlas · {loading ? 'syncing' : 'live'}
          </p>
        </div>
      </div>

      <nav className="xeno-glass order-last flex w-full items-center gap-1 overflow-x-auto p-1 md:order-none md:w-auto">
        {TABS.map((tab) => {
          const active = activeFeedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex-1 whitespace-nowrap rounded-[14px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-all duration-500 md:flex-none md:px-4 md:text-[11px] md:tracking-[0.16em] ${
                active ? 'bg-white text-black shadow-[0_0_30px_rgba(94,255,216,0.45)]' : 'text-white/55 hover:text-white'
              }`}
            >
              <sup className={`mr-1.5 text-[8px] ${active ? 'text-black/50' : 'text-[var(--xeno-a)]'}`}>{tab.idx}</sup>
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-1.5 md:gap-2">
        <div className="mr-2 hidden text-right font-mono xl:block">
          <span className="block text-[9px] uppercase tracking-[0.3em] text-white/40">Contacts</span>
          <span className="text-sm tabular-nums text-[var(--xeno-a)]">
            <NumberTicker value={nodeCount} />
            <span className="text-white/30">
              {' / '}
              <NumberTicker value={totalCount} />
            </span>
          </span>
        </div>
        <TooltipProvider>
          <Tooltip label="Search all contacts">
            <button onClick={onSearch} className="xeno-btn" aria-label="Search sightings">
              <Search size={13} /> <span className="hidden lg:inline">⌘K</span>
            </button>
          </Tooltip>
          <Tooltip label="Analytics & distributions">
            <button onClick={onStats} className="xeno-btn" aria-label="Analytics">
              <Activity size={13} /> <span className="hidden lg:inline">Intel</span>
            </button>
          </Tooltip>
          <Tooltip label="Trending operator feed">
            <Link href="/feed" className="xeno-btn" aria-label="Feed">
              <Radio size={13} /> <span className="hidden lg:inline">Feed</span>
            </Link>
          </Tooltip>
          <Tooltip label="Submit a sighting">
            <button
              onClick={onSubmit}
              className="xeno-btn !border-[var(--xeno-a)]/60 !text-[var(--xeno-a)] hover:!text-black"
            >
              <UploadCloud size={13} /> <span className="hidden sm:inline">Report</span>
            </button>
          </Tooltip>
          <UserChip />
        </TooltipProvider>
      </div>
    </header>
  );
}
