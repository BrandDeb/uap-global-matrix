/**
 * src/types/index.ts
 * ---------------------------------------------------------------------------
 * Core domain + persistence types for the UAP Global Matrix.
 *
 * These types mirror the authoritative Phase-4 SQL schema 1:1:
 *
 *   ENUM classification_tier  : CLASS_A | CLASS_B | CLASS_C | FLAGGED
 *   ENUM sensor_evidence_type : RADAR_VISUAL | FLIR_THERMAL | OPTICAL_VIDEO
 *                               | OPTICAL_PHOTO | SATELLITE_ANOMALY
 *   TABLE uap_sightings(...)        → UAPSightingRow / UAPSighting
 *   TABLE verification_logs(...)    → VerificationLogRow / VerificationLog
 *
 * Two layers are modeled deliberately:
 *   1. `*Row` types  — snake_case, exactly what `supabase-js` returns/accepts,
 *                       with raw PostGIS geography.
 *   2. Domain types  — camelCase, immutable, with geography decoded into the
 *                       flat {@link GeoCoordinates} interface for the app.
 *
 * PostGIS note (enforced project-wide, see CLAUDE.md): `location_coordinates`
 * is `geography(Point, 4326)` (WGS84). A bare select returns a WKB hex string;
 * project it via `ST_AsGeoJSON(...)` to obtain {@link GeoJSONPoint}.
 * ---------------------------------------------------------------------------
 */

/* ===========================================================================
 * Geospatial primitives
 * ======================================================================== */

/**
 * RFC 7946 GeoJSON Point — the JSON shape from `ST_AsGeoJSON(geo)::json`.
 * Coordinate order is GeoJSON-canonical `[longitude, latitude]` (X, Y), the
 * reverse of the human-readable {@link GeoCoordinates} order.
 */
export interface GeoJSONPoint {
  readonly type: 'Point';
  readonly coordinates: readonly [longitude: number, latitude: number];
}

/**
 * Raw storage representation of a `geography(Point, 4326)` column:
 *   - {@link GeoJSONPoint} when selected via `ST_AsGeoJSON(...)`
 *   - a WKB/EWKB hex `string` for a bare column select
 * Decode to {@link GeoCoordinates} at the data-access boundary.
 */
export type PostGISGeographyPoint = GeoJSONPoint | string;

/**
 * Flat, application-facing coordinate pair — the ONLY coordinate shape the UI,
 * the globe scene, and business logic should ever see.
 */
export interface GeoCoordinates {
  /** WGS84 latitude in decimal degrees. Range: [-90, 90]. */
  latitude: number;
  /** WGS84 longitude in decimal degrees. Range: [-180, 180]. */
  longitude: number;
}

/* ===========================================================================
 * Enumerations  (map to the Postgres ENUM types verbatim)
 *
 * Modeled as `const` tuples so each enum yields BOTH a static union type and a
 * runtime array (for <select> options, validation, seeding).
 * ======================================================================== */

/** Postgres `classification_tier` enum — credibility/disposition bucket. */
export const CLASSIFICATION_TIERS = ['CLASS_A', 'CLASS_B', 'CLASS_C', 'FLAGGED'] as const;
export type ClassificationTier = (typeof CLASSIFICATION_TIERS)[number];

/** Postgres `sensor_evidence_type` enum — element type of `evidence_types[]`. */
export const SENSOR_EVIDENCE_TYPES = [
  'RADAR_VISUAL',
  'FLIR_THERMAL',
  'OPTICAL_VIDEO',
  'OPTICAL_PHOTO',
  'SATELLITE_ANOMALY',
] as const;
export type SensorEvidenceType = (typeof SENSOR_EVIDENCE_TYPES)[number];

/* ===========================================================================
 * Embedded JSONB shapes
 * ======================================================================== */

/** One entry in the `uap_sightings.media_assets` JSONB array. */
export interface MediaAsset {
  readonly filename: string;
  readonly mime_type: string;
  readonly size_bytes: number;
}

/** Shape written into `verification_logs.exif_data_extracted` (JSONB). */
export interface ExifMetadata {
  readonly make: string | null;
  readonly model: string | null;
  readonly capturedAt: string | null; // ISO-8601 or null
  readonly gps: { latitude: number; longitude: number } | null;
}

/* ===========================================================================
 * Persistence layer — Postgres row types (1:1 with table columns)
 *
 * Timestamps are ISO-8601 `string`s (what `timestamptz` serializes to over the
 * supabase-js wire). Nullability matches the DDL exactly.
 * ======================================================================== */

/** Row shape of the `uap_sightings` table. */
export interface UAPSightingRow {
  readonly id: string; // uuid, PK
  readonly title: string; // NOT NULL
  readonly description: string; // NOT NULL
  readonly event_timestamp: string; // timestamptz, NOT NULL
  readonly created_at: string; // timestamptz, default now()
  readonly location_coordinates: PostGISGeographyPoint; // geography(Point,4326), NOT NULL
  readonly location_name: string; // NOT NULL
  readonly source_tier: ClassificationTier; // default 'CLASS_C'
  readonly evidence_types: readonly SensorEvidenceType[]; // default '{}'
  readonly credibility_score: number | null; // NUMERIC(5,2), nullable (no default)
  readonly media_assets: readonly MediaAsset[]; // jsonb, default '[]'
}

/** Row shape of the `verification_logs` forensic audit table. */
export interface VerificationLogRow {
  readonly id: string; // uuid, PK
  readonly sighting_id: string | null; // uuid FK → uap_sightings.id (ON DELETE CASCADE)
  readonly checked_at: string; // timestamptz, default now()
  readonly exif_data_extracted: ExifMetadata; // jsonb, default '{}'
  readonly is_metadata_authentic: boolean; // default true
  readonly synthetic_confidence_score: number | null; // NUMERIC(5,4), nullable
  readonly aircraft_in_proximity_count: number; // int, default 0
  readonly satellite_conjunction: boolean; // default false
  readonly weather_condition_summary: string | null; // varchar(255), nullable
}

/* ===========================================================================
 * Application / domain layer (camelCase, immutable, decoded geography)
 * ======================================================================== */

/**
 * A UAP sighting as consumed by the application. Derived from
 * {@link UAPSightingRow} with `location_coordinates` decoded into
 * {@link GeoCoordinates}.
 */
export interface UAPSighting {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** ISO-8601 timestamp (UTC) of the event. */
  readonly eventTimestamp: string;
  /** ISO-8601 timestamp (UTC) the record was created. */
  readonly createdAt: string;
  /** Decoded WGS84 position. Bridges `geography(Point, 4326)` → app layer. */
  readonly coordinates: GeoCoordinates;
  readonly locationName: string;
  readonly sourceTier: ClassificationTier;
  readonly evidenceTypes: readonly SensorEvidenceType[];
  /** Credibility Index, 0..100. `null` until scored. */
  readonly credibilityScore: number | null;
  readonly mediaAssets: readonly MediaAsset[];
}

/**
 * @deprecated Renamed to {@link UAPSighting} to match the `uap_sightings`
 * table. Retained so older imports of `UAPCase` keep resolving.
 */
export type UAPCase = UAPSighting;

/** @deprecated Use {@link UAPSightingRow}. */
export type UAPCaseRow = UAPSightingRow;

/** A verification event as consumed by the application. */
export interface VerificationLog {
  readonly id: string;
  readonly sightingId: string | null;
  /** ISO-8601 timestamp (UTC). */
  readonly checkedAt: string;
  readonly exifData: ExifMetadata;
  readonly isMetadataAuthentic: boolean;
  /** Synthetic-media probability, 0..1. `null` if not run. */
  readonly syntheticConfidenceScore: number | null;
  readonly aircraftInProximityCount: number;
  readonly satelliteConjunction: boolean;
  readonly weatherConditionSummary: string | null;
}

/* ===========================================================================
 * Write-side helper (insert payload for POST /api/verify → uap_sightings)
 *
 * DB-managed columns (id, created_at) are omitted. `locationCoordinates` is an
 * EWKT literal string — `SRID=4326;POINT(lng lat)` — which PostgREST casts to
 * geography server-side, so callers never hand-roll WKB.
 * ======================================================================== */

export interface UAPSightingInsert {
  readonly title: string;
  readonly description: string;
  readonly event_timestamp: string;
  /** EWKT geography literal: `SRID=4326;POINT(longitude latitude)`. */
  readonly location_coordinates: string;
  readonly location_name: string;
  readonly source_tier?: ClassificationTier;
  readonly evidence_types?: readonly SensorEvidenceType[];
  readonly credibility_score?: number;
  readonly media_assets?: readonly MediaAsset[];
}

/* ===========================================================================
 * Narrowing guards — validate untrusted strings (API input, DB drift) against
 * the enum tuples before asserting them as the literal-union types.
 * ======================================================================== */

/** Type guard: is `value` a known {@link ClassificationTier}? */
export function isClassificationTier(value: unknown): value is ClassificationTier {
  return (
    typeof value === 'string' &&
    (CLASSIFICATION_TIERS as readonly string[]).includes(value)
  );
}

/** Type guard: is `value` a known {@link SensorEvidenceType}? */
export function isSensorEvidenceType(value: unknown): value is SensorEvidenceType {
  return (
    typeof value === 'string' &&
    (SENSOR_EVIDENCE_TYPES as readonly string[]).includes(value)
  );
}
