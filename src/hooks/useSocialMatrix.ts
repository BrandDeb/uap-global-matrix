'use client';

/**
 * src/hooks/useSocialMatrix.ts
 * ---------------------------------------------------------------------------
 * Multi-stream live feed: historical sightings + active hotspot alerts, with
 * realtime INSERTs across both, plus a `postIntelMessage` writer for community
 * threads.
 *
 * Sightings are read from the `v_uap_sightings` view and re-fetched by id on
 * each realtime INSERT (realtime carries raw geography, not lat/lng). Hotspots
 * don't need their geography on the client, so their realtime payload is used
 * directly.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SIGHTING_LIST_COLUMNS, toLiveSighting, type LiveSighting } from '@/lib/sightings';

export interface HotspotAlert {
  readonly id: string;
  readonly locationName: string;
  readonly sightingCount: number;
  readonly severityLevel: string; // 'ELEVATED' | 'CRITICAL_FLAP'
  readonly lastDetectedAt: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface PostIntelResult {
  readonly error: { message: string } | null;
}

const HOTSPOT_COLUMNS =
  'id,location_name,sighting_count,severity_level,last_detected_at,latitude,longitude';
const HOTSPOT_LIMIT = 10;
const PAGE_SIZE = 1000; // PostgREST caps each response at ~1000 rows.
const MAX_SIGHTINGS = 12000;

function toHotspot(row: Record<string, unknown>): HotspotAlert {
  return {
    id: String(row.id),
    locationName: String(row.location_name ?? ''),
    sightingCount: Number(row.sighting_count ?? 0),
    severityLevel: String(row.severity_level ?? 'ELEVATED'),
    lastDetectedAt: String(row.last_detected_at ?? ''),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
  };
}

export function useSocialMatrix(): {
  sightings: LiveSighting[];
  hotspots: HotspotAlert[];
  loading: boolean;
  postIntelMessage: (sightingId: string, handle: string, text: string) => Promise<PostIntelResult>;
} {
  const [sightings, setSightings] = useState<LiveSighting[]>([]);
  const [hotspots, setHotspots] = useState<HotspotAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    (async () => {
      // Hotspots (small).
      const hRes = await supabase
        .from('v_hotspot_alerts')
        .select(HOTSPOT_COLUMNS)
        .order('last_detected_at', { ascending: false })
        .limit(HOTSPOT_LIMIT);
      if (!cancelled && hRes.data) {
        setHotspots(hRes.data.map((r) => toHotspot(r as Record<string, unknown>)));
      }

      // Sightings — paginated, since PostgREST returns at most ~1000 per request.
      const all: LiveSighting[] = [];
      for (let from = 0; from < MAX_SIGHTINGS && !cancelled; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('v_uap_sightings')
          .select(SIGHTING_LIST_COLUMNS)
          .order('event_timestamp', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data || data.length === 0) break;
        for (const r of data) {
          const s = toLiveSighting(r as Record<string, unknown>);
          if (s) all.push(s);
        }
        if (data.length < PAGE_SIZE) break;
      }
      if (!cancelled) {
        setSightings(all);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel('social-matrix-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'uap_sightings' },
        async (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (!id) return;
          const { data } = await supabase
            .from('v_uap_sightings')
            .select(SIGHTING_LIST_COLUMNS)
            .eq('id', id)
            .single();
          const mapped = data ? toLiveSighting(data as Record<string, unknown>) : null;
          if (mapped && !cancelled) {
            setSightings((curr) =>
              curr.some((s) => s.id === mapped.id) ? curr : [mapped, ...curr],
            );
          }
        },
      )
      .on(
        // '*' so in-place cluster escalations (UPDATE) stream too, not just new ones.
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hotspot_alerts' },
        async (payload) => {
          if (cancelled) return;
          const id = (payload.new as { id?: string }).id;
          if (!id) return; // ignore DELETE (no new row)
          // Re-fetch from the view to get decoded center coordinates.
          const { data } = await supabase
            .from('v_hotspot_alerts')
            .select(HOTSPOT_COLUMNS)
            .eq('id', id)
            .single();
          if (!data || cancelled) return;
          const hotspot = toHotspot(data as Record<string, unknown>);
          setHotspots((curr) =>
            [hotspot, ...curr.filter((h) => h.id !== hotspot.id)].slice(0, HOTSPOT_LIMIT),
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const postIntelMessage = useCallback(
    async (sightingId: string, handle: string, text: string): Promise<PostIntelResult> => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('uap_intel_threads').insert({
        sighting_id: sightingId,
        operator_handle: handle,
        intel_text: text,
      });
      return { error: error ? { message: error.message } : null };
    },
    [],
  );

  return { sightings, hotspots, loading, postIntelMessage };
}
