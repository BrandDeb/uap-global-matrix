'use client';

/**
 * src/hooks/useLazyCaseFile.ts
 * ---------------------------------------------------------------------------
 * Lazily loads a single case file (decoded sighting) by id when a marker or
 * ticker row is selected, and clears it when the dossier closes.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useState } from 'react';
import { toLiveSighting, type LiveSighting } from '@/lib/sightings';

export function useLazyCaseFile(): {
  caseData: LiveSighting | null;
  fetchCaseFile: (id: string) => Promise<void>;
  clearCaseFile: () => void;
} {
  const [caseData, setCaseData] = useState<LiveSighting | null>(null);

  const fetchCaseFile = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/sightings/${encodeURIComponent(id)}`, { cache: 'no-store' });
      setCaseData(res.ok ? toLiveSighting((await res.json()) as Record<string, unknown>) : null);
    } catch {
      setCaseData(null);
    }
  }, []);

  const clearCaseFile = useCallback(() => setCaseData(null), []);

  return { caseData, fetchCaseFile, clearCaseFile };
}
