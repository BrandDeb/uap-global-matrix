'use client';

/**
 * src/components/ui/TimelineScrubber.tsx
 * ---------------------------------------------------------------------------
 * Chrono scrubber — filters the globe to sightings up to a chosen year. A
 * per-decade histogram sits above the track (decades up to the selected year
 * glow), and the selected year is set in oversized display type.
 * ---------------------------------------------------------------------------
 */

import type { CSSProperties } from 'react';
import type { DecadeBucket } from '@/lib/analytics';

interface TimelineScrubberProps {
  readonly minYear: number;
  readonly maxYear: number;
  readonly currentYear: number;
  readonly onYearChange: (year: number) => void;
  readonly decades?: readonly DecadeBucket[];
  readonly maxDecadeCount?: number;
}

export default function TimelineScrubber({
  minYear,
  maxYear,
  currentYear,
  onYearChange,
  decades = [],
  maxDecadeCount = 1,
}: TimelineScrubberProps) {
  const pct = ((currentYear - minYear) / (maxYear - minYear)) * 100;
  return (
    <div className="xeno-glass pointer-events-auto flex items-end gap-4 px-4 py-3 md:gap-6 md:px-6 md:py-4">
      <div className="shrink-0 leading-none">
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.35em] text-white/40 sm:block">Chrono · up to</span>
        <span className="xeno-gradient-text font-[family-name:var(--font-display)] text-4xl font-extrabold tabular-nums max-md:text-2xl">
          {currentYear}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {decades.length > 0 && (
          <div className="flex h-6 items-end gap-[3px] md:h-10">
            {decades.map((d) => {
              const lit = d.decade <= currentYear;
              return (
                <div
                  key={d.decade}
                  className="group relative flex-1 rounded-sm transition-all duration-500"
                  style={{
                    height: `${Math.max(6, (d.count / maxDecadeCount) * 100)}%`,
                    background: lit
                      ? 'linear-gradient(to top, rgba(165,139,255,0.25), var(--xeno-a))'
                      : 'rgba(255,255,255,0.06)',
                    boxShadow: lit ? '0 0 12px rgba(94,255,216,0.35)' : 'none',
                  }}
                  title={`${d.decade}s · ${d.count} contacts`}
                />
              );
            })}
          </div>
        )}
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={currentYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="xeno-range w-full cursor-pointer"
          style={{ '--p': `${pct}%` } as CSSProperties}
          aria-label="Filter sightings up to year"
        />
        <div className="flex justify-between font-mono text-[9px] tracking-[0.3em] text-white/35">
          <span>{minYear}</span>
          <span className="hidden sm:inline">ROSWELL → PRESENT</span>
          <span>{maxYear}</span>
        </div>
      </div>
    </div>
  );
}
