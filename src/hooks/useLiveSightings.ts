'use client';

/**
 * src/hooks/useLiveSightings.ts
 * ---------------------------------------------------------------------------
 * Live sighting feed: loads the historical archive once, then subscribes to
 * realtime INSERTs so new sightings appear without a page refresh.
 *
 * Two correctness details the naive version misses:
 *   1. Reads come from the `v_uap_sightings` VIEW, which decodes the PostGIS
 *      geography into latitude/longitude. A bare `uap_sightings` select returns
 *      a WKB hex string the globe can't plot.
 *   2. Realtime `postgres_changes` fires on the TABLE, and its payload carries
 *      the raw geography too — so on each INSERT we re-fetch that one row from
 *      the view (by id) to get decoded coordinates before appending.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  isClassificationTier,
  isSensorEvidenceType,
  type ClassificationTier,
  type SensorEvidenceType,
} from '@/types';

/** App-facing sighting: flat coordinates for the map + fields for the dossier. */
export interface LiveSighting {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly credibilityScore: number;
  readonly eventTimestamp: string;
  readonly createdAt: string;
  readonly locationName: string;
  readonly sourceTier: ClassificationTier;
  readonly evidenceTypes: SensorEvidenceType[];
}

const VIEW_COLUMNS =
  'id,title,description,event_timestamp,created_at,location_name,source_tier,evidence_types,credibility_score,latitude,longitude';

/** Map a decoded view row to a LiveSighting, validating at the boundary. */
function toLiveSighting(row: Record<string, unknown>): LiveSighting | null {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    latitude,
    longitude,
    credibilityScore: row.credibility_score == null ? 0 : Number(row.credibility_score),
    eventTimestamp: String(row.event_timestamp ?? ''),
    createdAt: String(row.created_at ?? ''),
    locationName: String(row.location_name ?? ''),
    sourceTier: isClassificationTier(row.source_tier) ? row.source_tier : 'FLAGGED',
    evidenceTypes: Array.isArray(row.evidence_types)
      ? row.evidence_types.filter(isSensorEvidenceType)
      : [],
  };
}

export function useLiveSightings(): { sightings: LiveSighting[]; loading: boolean } {
  const [sightings, setSightings] = useState<LiveSighting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    // 1. Historical archive.
    (async () => {
      const { data, error } = await supabase
        .from('v_uap_sightings')
        .select(VIEW_COLUMNS)
        .order('event_timestamp', { ascending: false });
      if (cancelled) return;
      if (!error && data) {
        setSightings(
          data
            .map((r) => toLiveSighting(r as Record<string, unknown>))
            .filter((s): s is LiveSighting => s !== null),
        );
      }
      setLoading(false);
    })();

    // 2. Live incoming intelligence.
    const channel = supabase
      .channel('live-matrix')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'uap_sightings' },
        async (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (!id) return;
          // Re-fetch from the view to decode geography → lat/lng.
          const { data } = await supabase
            .from('v_uap_sightings')
            .select(VIEW_COLUMNS)
            .eq('id', id)
            .single();
          const mapped = data ? toLiveSighting(data as Record<string, unknown>) : null;
          if (mapped && !cancelled) {
            setSightings((current) =>
              current.some((s) => s.id === mapped.id) ? current : [mapped, ...current],
            );
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { sightings, loading };
}
