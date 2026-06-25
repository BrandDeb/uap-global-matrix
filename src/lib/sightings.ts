/**
 * src/lib/sightings.ts
 * ---------------------------------------------------------------------------
 * Shared sighting view-model + decoder used by the live hooks and the dossier.
 * Reads come from the `v_uap_sightings` view (geography already decoded into
 * latitude/longitude).
 * ---------------------------------------------------------------------------
 */

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

/** Lean columns for the bulk feed — no `description` (fetched lazily per case). */
export const SIGHTING_LIST_COLUMNS =
  'id,title,event_timestamp,location_name,source_tier,evidence_types,credibility_score,latitude,longitude';

/** Full columns for a single case file (adds description + created_at). */
export const SIGHTING_DETAIL_COLUMNS =
  'id,title,description,event_timestamp,created_at,location_name,source_tier,evidence_types,credibility_score,latitude,longitude';

/** Map a decoded view row to a LiveSighting, validating at the boundary. */
export function toLiveSighting(row: Record<string, unknown>): LiveSighting | null {
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
