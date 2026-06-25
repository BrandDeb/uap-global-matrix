'use client';

/**
 * src/components/ui/CaseDossier.tsx
 * ---------------------------------------------------------------------------
 * Slide-out intelligence dossier for a selected sighting. Reads the normalized
 * camelCase {@link LiveSighting} (not raw snake_case rows).
 * ---------------------------------------------------------------------------
 */

import { X } from 'lucide-react';
import type { LiveSighting } from '@/hooks/useLiveSightings';

interface CaseDossierProps {
  readonly sighting: LiveSighting | null;
  readonly onClose: () => void;
}

export default function CaseDossier({ sighting, onClose }: CaseDossierProps) {
  if (!sighting) return null;

  const eventDate = new Date(sighting.eventTimestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div
      style={{ animation: 'dossier-in 0.2s ease-out' }}
      className="absolute right-4 top-4 z-50 max-h-[90vh] w-96 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900/95 p-6 text-zinc-100 shadow-2xl backdrop-blur-md"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="rounded bg-emerald-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400">
            {sighting.sourceTier.replace(/_/g, ' ')}
          </span>
          <h2 className="mt-2 text-xl font-bold leading-tight">{sighting.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 transition hover:text-white"
          aria-label="Close dossier"
        >
          <X size={20} />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 border-y border-zinc-800 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Date of Incident</p>
          <p className="font-mono text-sm">{eventDate}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">AI Credibility</p>
          <p className="font-mono text-sm text-emerald-400">{sighting.credibilityScore}%</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Location</p>
          <p className="font-mono text-sm">{sighting.locationName}</p>
        </div>
      </div>

      {/* Summary */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Declassified Summary</p>
        <p className="text-sm leading-relaxed text-zinc-300">{sighting.description}</p>
      </div>

      {/* Evidence */}
      {sighting.evidenceTypes.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Sensor Evidence</p>
          <div className="flex flex-wrap gap-2">
            {sighting.evidenceTypes.map((type) => (
              <span
                key={type}
                className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 font-mono text-xs"
              >
                {type.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
