/**
 * src/app/api/verify/route.ts
 * ---------------------------------------------------------------------------
 * POST /api/verify  —  Sighting intake + automated credibility scoring.
 *
 * Pipeline (top to bottom):
 *   1. Parse the multipart/form-data payload (media file + report fields).
 *   2. Validate + normalize inputs (fail fast at the boundary).
 *   3. Extract EXIF metadata from the media with `exifr`.
 *   4. Run the (simulated) multi-model deep-fake detection hook.
 *   5. Run the (simulated) prosaic-explanation proximity checks
 *      (nearby aircraft / satellite conjunction / weather).
 *   6. Compute the structural Credibility Index `C` from weighted signals.
 *   7. Persist the sighting into `uap_sightings`, writing the position as a
 *      PostGIS geography literal (`SRID=4326;POINT(lng lat)`).
 *   8. Append an automated `verification_logs` forensic entry (incl. the
 *      proximity columns).
 *
 * Enum types are imported from `@/types` so there is a single source of truth.
 * Runtime: Node.js (required — `exifr` + `Buffer` are not Edge-compatible).
 * ---------------------------------------------------------------------------
 */

import exifr from 'exifr';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { ClassificationTier, SensorEvidenceType } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ===========================================================================
 * Constants
 * ======================================================================== */

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB hard cap
const ACCEPTED_PREFIXES = ['image/', 'video/'] as const;

/**
 * Weights for the Credibility Index. They MUST sum to 1 so that `C` lands in
 * [0, 100]. This weighting is the core domain judgement of the system — tune
 * it to reflect how much each signal should move the needle.
 */
const CREDIBILITY_WEIGHTS = {
  mediaAuthenticity: 0.35, // 1 - deepfake probability (most important signal)
  prosaicImprobability: 0.2, // how unlikely a mundane explanation is
  geoConsistency: 0.15, // EXIF GPS vs. reported coordinates
  exifIntegrity: 0.1, // how complete the camera metadata is
  temporalConsistency: 0.1, // EXIF capture time vs. reported timestamp
  descriptiveRichness: 0.1, // quality/length of the human report
} as const;

/* ===========================================================================
 * Types
 * ======================================================================== */

interface VerifyInput {
  readonly file: File;
  readonly latitude: number;
  readonly longitude: number;
  readonly timestamp: string; // ISO-8601 → event_timestamp
  readonly title: string;
  readonly description: string;
  readonly locationName: string; // location_name is NOT NULL in the schema
}

interface ExifSummary {
  readonly make: string | null;
  readonly model: string | null;
  readonly capturedAt: string | null; // ISO-8601 or null
  readonly gps: { latitude: number; longitude: number } | null;
}

interface DeepfakeModelResult {
  readonly model: string;
  readonly fakeProbability: number; // 0..1 (higher = more likely synthetic)
}

interface DeepfakeReport {
  readonly aggregateFakeProbability: number; // 0..1
  readonly models: readonly DeepfakeModelResult[];
}

interface ProximityAssessment {
  readonly aircraftInProximityCount: number;
  readonly satelliteConjunction: boolean;
  readonly weatherSummary: string;
}

interface CredibilitySignals {
  readonly mediaAuthenticity: number;
  readonly prosaicImprobability: number;
  readonly geoConsistency: number;
  readonly exifIntegrity: number;
  readonly temporalConsistency: number;
  readonly descriptiveRichness: number;
}

/* ===========================================================================
 * Small math helpers
 * ======================================================================== */

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres between two WGS84 points. */
function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* ===========================================================================
 * 1–2. Parsing & validation
 * ======================================================================== */

class ValidationError extends Error {}

function parseCoordinate(
  raw: FormDataEntryValue | null,
  label: 'latitude' | 'longitude',
): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${label} must be a finite number.`);
  }
  const bound = label === 'latitude' ? 90 : 180;
  if (Math.abs(value) > bound) {
    throw new ValidationError(`${label} ${value} is out of range (±${bound}).`);
  }
  return value;
}

function parseVerifyInput(form: FormData): VerifyInput {
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new ValidationError('A non-empty "file" field is required.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError(`File exceeds the ${MAX_UPLOAD_BYTES} byte limit.`);
  }
  if (!ACCEPTED_PREFIXES.some((p) => file.type.startsWith(p))) {
    throw new ValidationError(`Unsupported media type "${file.type || 'unknown'}".`);
  }

  const latitude = parseCoordinate(form.get('latitude'), 'latitude');
  const longitude = parseCoordinate(form.get('longitude'), 'longitude');

  const timestampRaw = String(form.get('timestamp') ?? '').trim();
  const parsedTime = new Date(timestampRaw);
  if (!timestampRaw || Number.isNaN(parsedTime.getTime())) {
    throw new ValidationError('A valid ISO "timestamp" is required.');
  }

  const title = String(form.get('title') ?? '').trim();
  if (!title) {
    throw new ValidationError('A non-empty "title" is required.');
  }

  // `location_name` is NOT NULL in the schema. Accept it if provided,
  // otherwise synthesize a deterministic label from the coordinates.
  const locationName =
    String(form.get('location_name') ?? '').trim() ||
    `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  return {
    file,
    latitude,
    longitude,
    timestamp: parsedTime.toISOString(),
    title,
    description: String(form.get('description') ?? '').trim(),
    locationName,
  };
}

/* ===========================================================================
 * 3. EXIF extraction
 * ======================================================================== */

async function extractExif(buffer: Buffer): Promise<ExifSummary> {
  // Videos and stripped images throw or return undefined — treat as "no EXIF".
  try {
    const tags = await exifr.parse(buffer, { gps: true });
    if (!tags) {
      return { make: null, model: null, capturedAt: null, gps: null };
    }

    const captured =
      tags.DateTimeOriginal instanceof Date
        ? tags.DateTimeOriginal.toISOString()
        : null;

    const hasGps =
      Number.isFinite(tags.latitude) && Number.isFinite(tags.longitude);

    return {
      make: typeof tags.Make === 'string' ? tags.Make : null,
      model: typeof tags.Model === 'string' ? tags.Model : null,
      capturedAt: captured,
      gps: hasGps
        ? { latitude: tags.latitude as number, longitude: tags.longitude as number }
        : null,
    };
  } catch {
    return { make: null, model: null, capturedAt: null, gps: null };
  }
}

/* ===========================================================================
 * 4. Multi-model deep-fake detection hook (SIMULATED)
 *
 * Stand-in for an ensemble of forensic models. Scores are derived
 * deterministically from the media bytes so the same upload always yields the
 * same verdict (stable + testable). Replace the body with real inference
 * calls; the surrounding contract stays identical.
 * ======================================================================== */

async function runDeepfakeDetection(
  buffer: Buffer,
  mediaType: string,
): Promise<DeepfakeReport> {
  const modelNames = ['xception-v2', 'efficientnet-b4', 'clip-forensics'];

  // Deterministic byte fingerprint in [0, 1).
  let acc = 0;
  const stride = Math.max(1, Math.floor(buffer.length / 4096));
  for (let i = 0; i < buffer.length; i += stride) {
    acc = (acc + buffer[i] * (i + 1)) % 9973;
  }
  const fingerprint = acc / 9973;

  // Video is harder to fake convincingly end-to-end → slightly lower baseline.
  const baseline = mediaType.startsWith('video/') ? 0.18 : 0.27;

  const models = modelNames.map((model, idx) => {
    const jitter = ((fingerprint * (idx + 7)) % 1) * 0.3 - 0.15;
    return { model, fakeProbability: clamp01(baseline + jitter) };
  });

  const aggregateFakeProbability =
    models.reduce((sum, m) => sum + m.fakeProbability, 0) / models.length;

  return { aggregateFakeProbability, models };
}

/* ===========================================================================
 * 5. Prosaic-explanation proximity checks (SIMULATED)
 *
 * Stand-in for ADS-B flight history, satellite-pass ephemeris, and a weather
 * service. Results are deterministic in the report's coordinates + time so the
 * same sighting always resolves the same way. These feed both the
 * `prosaicImprobability` credibility signal and the forensic log columns.
 * ======================================================================== */

function runProximityChecks(input: VerifyInput): ProximityAssessment {
  // Deterministic pseudo-seed in [0, 1) from the location + event time.
  const seed = Math.abs(
    Math.sin(input.latitude * 12.9898 + input.longitude * 78.233) * 43758.5453,
  );
  const frac = seed - Math.floor(seed);

  const aircraftInProximityCount = Math.floor(frac * 7); // 0..6
  const minute = new Date(input.timestamp).getUTCMinutes();
  const satelliteConjunction = (minute + aircraftInProximityCount) % 3 === 0;

  const summaries = [
    'Clear skies',
    'Scattered cloud',
    'Overcast',
    'Light rain',
    'Fog / low visibility',
    'Thunderstorm activity',
  ];
  const weatherSummary = summaries[Math.floor(frac * summaries.length)];

  return { aircraftInProximityCount, satelliteConjunction, weatherSummary };
}

/* ===========================================================================
 * 6. Credibility Index model
 * ======================================================================== */

function computeSignals(
  input: VerifyInput,
  exif: ExifSummary,
  deepfake: DeepfakeReport,
  proximity: ProximityAssessment,
): CredibilitySignals {
  // Authenticity: inverse of synthetic-media probability.
  const mediaAuthenticity = clamp01(1 - deepfake.aggregateFakeProbability);

  // Prosaic improbability: nearby aircraft and a satellite conjunction make a
  // mundane explanation more likely, dragging credibility down.
  const aircraftPenalty = Math.min(proximity.aircraftInProximityCount * 0.15, 0.6);
  const satellitePenalty = proximity.satelliteConjunction ? 0.25 : 0;
  const prosaicImprobability = clamp01(1 - aircraftPenalty - satellitePenalty);

  // EXIF integrity: fraction of the four expected provenance fields present.
  const present = [exif.make, exif.model, exif.capturedAt, exif.gps].filter(
    (v) => v != null,
  ).length;
  const exifIntegrity = present / 4;

  // Geo consistency: EXIF GPS within 5 km → 1.0, decaying to 0 by 250 km.
  // No EXIF GPS → neutral 0.5 (cannot confirm or deny).
  let geoConsistency = 0.5;
  if (exif.gps) {
    const km = haversineKm(
      input.latitude,
      input.longitude,
      exif.gps.latitude,
      exif.gps.longitude,
    );
    geoConsistency = clamp01(1 - Math.max(0, km - 5) / 245);
  }

  // Temporal consistency: EXIF capture within 24 h → 1.0, decaying to 0 by
  // 30 days. No EXIF time → neutral 0.5.
  let temporalConsistency = 0.5;
  if (exif.capturedAt) {
    const hours =
      Math.abs(
        new Date(input.timestamp).getTime() - new Date(exif.capturedAt).getTime(),
      ) /
      36e5;
    temporalConsistency = clamp01(1 - Math.max(0, hours - 24) / (30 * 24 - 24));
  }

  // Descriptive richness: blends a presence floor with description length.
  const descLen = clamp01(input.description.length / 200);
  const descriptiveRichness = clamp01(0.25 + 0.75 * descLen);

  return {
    mediaAuthenticity,
    prosaicImprobability,
    geoConsistency,
    exifIntegrity,
    temporalConsistency,
    descriptiveRichness,
  };
}

/** Weighted linear combination of the signals, projected onto [0, 100]. */
function computeCredibilityIndex(signals: CredibilitySignals): number {
  const c =
    signals.mediaAuthenticity * CREDIBILITY_WEIGHTS.mediaAuthenticity +
    signals.prosaicImprobability * CREDIBILITY_WEIGHTS.prosaicImprobability +
    signals.geoConsistency * CREDIBILITY_WEIGHTS.geoConsistency +
    signals.exifIntegrity * CREDIBILITY_WEIGHTS.exifIntegrity +
    signals.temporalConsistency * CREDIBILITY_WEIGHTS.temporalConsistency +
    signals.descriptiveRichness * CREDIBILITY_WEIGHTS.descriptiveRichness;
  // NUMERIC(5,2) column → two decimal places.
  return Math.round(clamp01(c) * 10000) / 100;
}

/** Map the automated score onto the `classification_tier` enum. */
function tierFromCredibility(credibility: number): ClassificationTier {
  if (credibility >= 85) return 'CLASS_A';
  if (credibility >= 65) return 'CLASS_B';
  if (credibility >= 40) return 'CLASS_C';
  return 'FLAGGED';
}

/** Infer the sensor-evidence enum array from the uploaded media's MIME type. */
function evidenceTypesFromMedia(mediaType: string): SensorEvidenceType[] {
  if (mediaType.startsWith('video/')) return ['OPTICAL_VIDEO'];
  return ['OPTICAL_PHOTO'];
}

/* ===========================================================================
 * 7. PostGIS geography literal
 *
 * PostgREST accepts EWKT text for a geography column and casts it server-side.
 * Order is POINT(longitude latitude) — X then Y. Inputs are already validated
 * finite numbers, so the template string cannot carry an injection payload.
 * ======================================================================== */

function toGeographyPoint(latitude: number, longitude: number): string {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

/* ===========================================================================
 * Route handler
 * ======================================================================== */

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Parse multipart payload.
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json(400, { success: false, error: 'Expected multipart/form-data.' });
    }

    // 2. Validate + normalize.
    const input = parseVerifyInput(form);
    const buffer = Buffer.from(await input.file.arrayBuffer());

    // 3–6. Analyse the media and score it.
    const [exif, deepfake] = await Promise.all([
      extractExif(buffer),
      runDeepfakeDetection(buffer, input.file.type),
    ]);
    const proximity = runProximityChecks(input);
    const signals = computeSignals(input, exif, deepfake, proximity);
    const credibility = computeCredibilityIndex(signals);
    const sourceTier = tierFromCredibility(credibility);
    const evidenceTypes = evidenceTypesFromMedia(input.file.type);

    // 7. Persist the sighting (position as a PostGIS geography literal).
    const supabase = getSupabaseAdmin();
    const { data: sighting, error: insertError } = await supabase
      .from('uap_sightings')
      .insert({
        title: input.title,
        description: input.description,
        event_timestamp: input.timestamp,
        location_coordinates: toGeographyPoint(input.latitude, input.longitude),
        location_name: input.locationName,
        source_tier: sourceTier,
        evidence_types: evidenceTypes,
        credibility_score: credibility,
        media_assets: [
          {
            filename: input.file.name,
            mime_type: input.file.type,
            size_bytes: input.file.size,
          },
        ],
      })
      .select('id')
      .single();

    if (insertError || !sighting) {
      return json(502, {
        success: false,
        error: `Failed to persist sighting: ${insertError?.message ?? 'unknown error'}`,
      });
    }

    // 8. Append the automated forensic verification-log entry.
    const { error: logError } = await supabase.from('verification_logs').insert({
      sighting_id: sighting.id,
      exif_data_extracted: exif,
      is_metadata_authentic: deepfake.aggregateFakeProbability < 0.5,
      // NUMERIC(5,4) column → four decimal places.
      synthetic_confidence_score:
        Math.round(deepfake.aggregateFakeProbability * 10000) / 10000,
      aircraft_in_proximity_count: proximity.aircraftInProximityCount,
      satellite_conjunction: proximity.satelliteConjunction,
      weather_condition_summary: proximity.weatherSummary,
    });

    if (logError) {
      // The sighting is saved; the audit row failed. Report as partial success
      // rather than pretending the whole request failed.
      return json(207, {
        success: true,
        data: { id: sighting.id, credibilityScore: credibility, sourceTier },
        error: `Sighting stored, but verification log failed: ${logError.message}`,
      });
    }

    return json(201, {
      success: true,
      data: {
        id: sighting.id,
        credibilityScore: credibility,
        sourceTier,
        evidenceTypes,
        signals,
        deepfake,
        proximity,
        exif,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return json(400, { success: false, error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return json(500, { success: false, error: message });
  }
}

/** Consistent JSON envelope helper. */
function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}
