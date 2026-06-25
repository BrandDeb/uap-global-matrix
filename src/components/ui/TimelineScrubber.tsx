'use client';

/**
 * src/components/ui/TimelineScrubber.tsx
 * ---------------------------------------------------------------------------
 * Bottom timeline slider — filters the globe to sightings up to a chosen year.
 * ---------------------------------------------------------------------------
 */

interface TimelineScrubberProps {
  readonly minYear: number;
  readonly maxYear: number;
  readonly currentYear: number;
  readonly onYearChange: (year: number) => void;
}

export default function TimelineScrubber({
  minYear,
  maxYear,
  currentYear,
  onYearChange,
}: TimelineScrubberProps) {
  return (
    <div className="flex shrink-0 items-center gap-4 rounded-xl border border-zinc-900 bg-zinc-900/40 px-4 py-2.5 backdrop-blur-md">
      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        Timeline
      </span>
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
  );
}
