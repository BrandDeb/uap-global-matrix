'use client';

/**
 * src/hooks/useSocialMatrix.ts
 * ---------------------------------------------------------------------------
 * Multi-stream live feed: historical sightings + active hotspot alerts from
 * GET /api/matrix, then a lightweight poll (`?since=` cursor) every
 * POLL_MS that merges newly created sightings and refreshed hotspots, plus a
 * `postIntelMessage` writer for community threads.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import { toLiveSighting, type LiveSighting } from '@/lib/sightings';
import { getOperatorId } from '@/lib/operatorId';

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

const POLL_MS = 15000;

interface MatrixPayload {
  sightings: Record<string, unknown>[];
  hotspots: Record<string, unknown>[];
  serverTime: string;
}

async function fetchMatrix(since: string | null): Promise<MatrixPayload | null> {
  try {
    const res = await fetch(since ? `/api/matrix?since=${encodeURIComponent(since)}` : '/api/matrix', {
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as MatrixPayload) : null;
  } catch {
    return null;
  }
}

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
    let cancelled = false;
    let cursor: string | null = null;
    let timer: number | undefined;

    const decode = (rows: Record<string, unknown>[]) =>
      rows.map(toLiveSighting).filter((x): x is LiveSighting => x !== null);

    const poll = async () => {
      const data = await fetchMatrix(cursor);
      if (cancelled) return;
      if (data) {
        const fresh = decode(data.sightings);
        if (cursor === null) {
          setSightings(fresh);
        } else if (fresh.length > 0) {
          setSightings((curr) => {
            const known = new Set(curr.map((s) => s.id));
            return [...fresh.filter((s) => !known.has(s.id)), ...curr];
          });
        }
        setHotspots(data.hotspots.map(toHotspot));
        cursor = data.serverTime;
      }
      setLoading(false);
      timer = window.setTimeout(poll, POLL_MS);
    };
    void poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const postIntelMessage = useCallback(
    async (sightingId: string, handle: string, text: string): Promise<PostIntelResult> => {
      try {
        const res = await fetch(`/api/sightings/${sightingId}/intel`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, handle: handle || getOperatorId() }),
        });
        if (res.ok) return { error: null };
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { error: { message: body.error ?? `HTTP ${res.status}` } };
      } catch (err: unknown) {
        return { error: { message: err instanceof Error ? err.message : 'Network error.' } };
      }
    },
    [],
  );

  return { sightings, hotspots, loading, postIntelMessage };
}
