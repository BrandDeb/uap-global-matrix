'use client';

/**
 * src/hooks/useLazyCaseFile.ts
 * ---------------------------------------------------------------------------
 * Lazily loads a single case file (decoded sighting) by id when a marker or
 * ticker row is selected, and clears it when the dossier closes.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SIGHTING_DETAIL_COLUMNS, toLiveSighting, type LiveSighting } from '@/lib/sightings';

export function useLazyCaseFile(): {
  caseData: LiveSighting | null;
  fetchCaseFile: (id: string) => Promise<void>;
  clearCaseFile: () => void;
} {
  const [caseData, setCaseData] = useState<LiveSighting | null>(null);

  const fetchCaseFile = useCallback(async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('v_uap_sightings')
      .select(SIGHTING_DETAIL_COLUMNS)
      .eq('id', id)
      .single();
    setCaseData(data ? toLiveSighting(data as Record<string, unknown>) : null);
  }, []);

  const clearCaseFile = useCallback(() => setCaseData(null), []);

  return { caseData, fetchCaseFile, clearCaseFile };
}
