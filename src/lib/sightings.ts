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

/** One item in a sighting's media gallery (declassified docs / sensor stills). */
export interface MediaItem {
  readonly url: string;
  readonly type: string;
}

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
  readonly isGovDeclassified: boolean;
  readonly mediaGallery: MediaItem[];
  readonly documentVaultUrl: string | null;
}

/** Lean columns for the bulk feed — no `description` (fetched lazily per case). */
export const SIGHTING_LIST_COLUMNS =
  'id,title,event_timestamp,location_name,source_tier,evidence_types,credibility_score,is_gov_declassified,latitude,longitude';

/** Full columns for a single case file (adds description, media + gov fields). */
export const SIGHTING_DETAIL_COLUMNS =
  'id,title,description,event_timestamp,created_at,location_name,source_tier,evidence_types,credibility_score,is_gov_declassified,media_gallery,document_vault_url,latitude,longitude';

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
    isGovDeclassified: row.is_gov_declassified === true,
    mediaGallery: Array.isArray(row.media_gallery)
      ? (row.media_gallery as Record<string, unknown>[])
          .filter((m) => m && typeof m.url === 'string')
          .map((m) => ({ url: String(m.url), type: String(m.type ?? 'media') }))
      : [],
    documentVaultUrl:
      typeof row.document_vault_url === 'string' ? row.document_vault_url : null,
  };
}
