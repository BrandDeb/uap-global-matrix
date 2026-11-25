'use client';

/**
 * src/components/ui/MatrixControlHUD.tsx
 * Floating top bar: wordmark, signal-band tabs (all / FOIA / citizen), node
 * counter and actions. Sits over the full-bleed WebGL stage without wrapping
 * across desktop viewports.
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
  readonly demoMode?: boolean;
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
  demoMode = false,
  onSearch,
  onStats,
  onSubmit,
}: MatrixControlHUDProps) {
  const statusLabel = loading ? 'syncing' : demoMode ? 'seed archive' : 'live';

  return (
    <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-2.5 lg:flex-nowrap lg:gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <div className="relative grid h-9 w-9 place-items-center xl:h-10 xl:w-10">
          <span className="absolute inset-0 animate-[spin_9s_linear_infinite] rounded-full border border-dashed border-[var(--xeno-a)]/60" />
          <span className="absolute inset-2 animate-[spin_5s_linear_infinite_reverse] rounded-full border border-[var(--xeno-b)]/60 border-t-transparent" />
          <span
            className={`h-2 w-2 rounded-full ${loading ? 'bg-[var(--xeno-b)]' : 'bg-[var(--xeno-a)] shadow-[0_0_12px_var(--xeno-a)]'}`}
          />
        </div>
        <div className="leading-none">
          <p className="font-[family-name:var(--font-display)] text-xs font-medium tracking-[0.28em] text-white xl:text-sm">
            UAP<span className="text-[var(--xeno-a)]">/</span>MATRIX
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-white/45">
            Xeno signal atlas · {statusLabel}
          </p>
        </div>
      </div>

      <nav className="xeno-glass order-3 flex w-full items-center justify-center gap-1 p-1 sm:w-auto lg:order-none">
        {TABS.map((tab) => {
          const active = activeFeedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group relative whitespace-nowrap rounded-[14px] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-all duration-300 xl:px-4 xl:py-2 xl:text-[11px] xl:tracking-[0.15em] ${
                active ? 'bg-white text-black shadow-[0_0_24px_rgba(94,255,216,0.4)]' : 'text-white/60 hover:text-white'
              }`}
            >
              <sup className={`mr-1 text-[8px] ${active ? 'text-black/50' : 'text-[var(--xeno-a)]'}`}>{tab.idx}</sup>
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-1.5 xl:gap-2">
        <div className="mr-1.5 hidden text-right font-mono md:block">
          <span className="block text-[8px] uppercase tracking-[0.28em] text-white/40">Contacts</span>
          <span className="whitespace-nowrap text-xs tabular-nums text-[var(--xeno-a)] xl:text-sm">
            <NumberTicker value={nodeCount} />
            <span className="text-white/30">
              {' / '}
              <NumberTicker value={totalCount} />
            </span>
          </span>
        </div>
        <TooltipProvider>
          <Tooltip label="Search all contacts">
            <button onClick={onSearch} className="xeno-btn !px-3 !py-1.5 xl:!px-4 xl:!py-2" aria-label="Search sightings">
              <Search size={13} /> ⌘K
            </button>
          </Tooltip>
          <Tooltip label="Analytics & distributions">
            <button onClick={onStats} className="xeno-btn !px-3 !py-1.5 xl:!px-4 xl:!py-2" aria-label="Analytics">
              <Activity size={13} /> <span className="hidden sm:inline">Intel</span>
            </button>
          </Tooltip>
          <Tooltip label="Trending operator feed">
            <Link href="/feed" className="xeno-btn !px-3 !py-1.5 xl:!px-4 xl:!py-2" aria-label="Feed">
              <Radio size={13} /> <span className="hidden sm:inline">Feed</span>
            </Link>
          </Tooltip>
          <Tooltip label="Submit a sighting">
            <button
              onClick={onSubmit}
              className="xeno-btn !border-[var(--xeno-a)]/60 !px-3 !py-1.5 !text-[var(--xeno-a)] hover:!text-black xl:!px-4 xl:!py-2"
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
