/**
 * src/lib/analytics.ts
 * ---------------------------------------------------------------------------
 * Client-side aggregation of the loaded sighting set into the distributions the
 * timeline histogram + intel-analytics panel render. Pure + framework-free.
 * ---------------------------------------------------------------------------
 */

import type { LiveSighting } from './sightings';
import { SENSOR_EVIDENCE_TYPES, type SensorEvidenceType } from '@/types';

export interface DecadeBucket {
  readonly decade: number;
  readonly count: number;
}

export interface LabelledBucket {
  readonly label: string;
  readonly count: number;
}

export interface AnalyticsSummary {
  readonly total: number;
  readonly decades: DecadeBucket[];
  readonly maxDecadeCount: number;
  readonly evidence: { readonly type: SensorEvidenceType; readonly count: number }[];
  readonly govCount: number;
  readonly citizenCount: number;
  readonly credibility: LabelledBucket[];
}

const FIRST_DECADE = 1940;
const LAST_DECADE = 2020;

export function computeAnalytics(sightings: readonly LiveSighting[]): AnalyticsSummary {
  const decadeCounts = new Map<number, number>();
  for (let d = FIRST_DECADE; d <= LAST_DECADE; d += 10) decadeCounts.set(d, 0);

  const evidenceCounts = new Map<SensorEvidenceType, number>();
  for (const t of SENSOR_EVIDENCE_TYPES) evidenceCounts.set(t, 0);

  const credBands = [0, 0, 0, 0, 0]; // 0-20,20-40,40-60,60-80,80-100
  let govCount = 0;

  for (const s of sightings) {
    const year = new Date(s.eventTimestamp).getUTCFullYear();
    if (Number.isFinite(year)) {
      const decade = Math.min(LAST_DECADE, Math.max(FIRST_DECADE, Math.floor(year / 10) * 10));
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    }
    for (const t of s.evidenceTypes) {
      evidenceCounts.set(t, (evidenceCounts.get(t) ?? 0) + 1);
    }
    if (s.isGovDeclassified) govCount += 1;
    const band = Math.min(4, Math.max(0, Math.floor(s.credibilityScore / 20)));
    credBands[band] += 1;
  }

  const decades: DecadeBucket[] = [];
  for (let d = FIRST_DECADE; d <= LAST_DECADE; d += 10) {
    decades.push({ decade: d, count: decadeCounts.get(d) ?? 0 });
  }
  const maxDecadeCount = Math.max(1, ...decades.map((d) => d.count));

  const evidence = SENSOR_EVIDENCE_TYPES.map((type) => ({
    type,
    count: evidenceCounts.get(type) ?? 0,
  })).sort((a, b) => b.count - a.count);

  return {
    total: sightings.length,
    decades,
    maxDecadeCount,
    evidence,
    govCount,
    citizenCount: sightings.length - govCount,
    credibility: [
      { label: '0–20', count: credBands[0] },
      { label: '20–40', count: credBands[1] },
      { label: '40–60', count: credBands[2] },
      { label: '60–80', count: credBands[3] },
      { label: '80–100', count: credBands[4] },
    ],
  };
}
