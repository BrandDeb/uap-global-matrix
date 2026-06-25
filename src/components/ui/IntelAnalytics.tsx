'use client';

/**
 * src/components/ui/IntelAnalytics.tsx
 * ---------------------------------------------------------------------------
 * Intel analytics overlay: archive distributions rendered as dependency-free
 * CSS bar charts (decade histogram, sensor evidence, credibility bands, source
 * split).
 * ---------------------------------------------------------------------------
 */

import { X, Activity } from 'lucide-react';
import type { AnalyticsSummary } from '@/lib/analytics';

interface IntelAnalyticsProps {
  readonly data: AnalyticsSummary;
  readonly onClose: () => void;
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-center">
      <div className={`text-xl font-bold ${accent}`}>{value.toLocaleString()}</div>
      <div className="text-[9px] uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">{title}</div>
      {children}
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 truncate text-right font-mono text-[10px] text-zinc-500">
        {label}
      </span>
      <div className="h-3 flex-1 overflow-hidden rounded bg-zinc-800/50">
        <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-12 shrink-0 font-mono text-[10px] text-zinc-400">{value.toLocaleString()}</span>
    </div>
  );
}

export default function IntelAnalytics({ data, onClose }: IntelAnalyticsProps) {
  const maxEvidence = Math.max(1, ...data.evidence.map((e) => e.count));
  const maxCred = Math.max(1, ...data.credibility.map((c) => c.count));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-sm font-bold tracking-widest text-cyan-400">
            <Activity size={16} /> INTEL ANALYTICS
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <Stat label="Total contacts" value={data.total} accent="text-zinc-100" />
          <Stat label="Gov / FOIA" value={data.govCount} accent="text-amber-400" />
          <Stat label="Citizen" value={data.citizenCount} accent="text-emerald-400" />
        </div>

        <Section title="Sightings by decade">
          <div className="flex h-32 items-end gap-1.5">
            {data.decades.map((d) => (
              <div key={d.decade} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-cyan-500/60"
                  style={{ height: `${(d.count / data.maxDecadeCount) * 100}%` }}
                  title={`${d.decade}s · ${d.count}`}
                />
                <span className="font-mono text-[8px] text-zinc-600">{`'${String(d.decade).slice(2)}`}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Sensor evidence">
          <div className="space-y-1.5">
            {data.evidence.map((e) => (
              <Bar
                key={e.type}
                label={e.type.replace(/_/g, ' ')}
                value={e.count}
                max={maxEvidence}
                color="#34d399"
              />
            ))}
          </div>
        </Section>

        <Section title="Credibility distribution">
          <div className="space-y-1.5">
            {data.credibility.map((c) => (
              <Bar key={c.label} label={c.label} value={c.count} max={maxCred} color="#22d3ee" />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
