'use client';

/**
 * src/components/ui/TimelineScrubber.tsx
 * ---------------------------------------------------------------------------
 * Bottom timeline slider — filters the globe to sightings up to a chosen year,
 * with a per-decade sightings histogram baked in above the track (decades up to
 * the selected year light up).
 * ---------------------------------------------------------------------------
 */

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
  return (
    <div className="flex shrink-0 flex-col gap-1.5 rounded-xl border border-zinc-900 bg-zinc-900/40 px-4 py-2.5 backdrop-blur-md">
      {decades.length > 0 && (
        <div className="flex h-8 items-end gap-1">
          {decades.map((d) => (
            <div
              key={d.decade}
              className="flex-1 rounded-t transition-colors"
              style={{
                height: `${Math.max(8, (d.count / maxDecadeCount) * 100)}%`,
                backgroundColor:
                  d.decade <= currentYear ? 'rgba(52,211,153,0.6)' : 'rgba(63,63,70,0.8)',
              }}
              title={`${d.decade}s · ${d.count} contacts`}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Timeline</span>
        <span className="font-mono text-[10px] text-zinc-600">{minYear}</span>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={currentYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-emerald-500"
          aria-label="Filter sightings up to year"
        />
        <span className="font-mono text-[10px] text-zinc-600">{maxYear}</span>
        <span className="w-12 text-right font-mono text-sm font-bold text-emerald-400">
          {currentYear}
        </span>
      </div>
    </div>
  );
}
