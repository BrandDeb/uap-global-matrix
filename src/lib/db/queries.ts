/**
 * src/lib/db/queries.ts
 * ---------------------------------------------------------------------------
 * Every SQL statement the app runs, in one place. Route handlers and server
 * components call these; client code calls the routes. Rows come back in the
 * same snake_case shape the decoders in `@/lib/sightings` already accept.
 * ---------------------------------------------------------------------------
 */
import 'server-only';
import { getDb } from './index';

const LIST_COLS = `id, title, event_timestamp, location_name, source_tier, evidence_types,
  credibility_score, is_gov_declassified, latitude, longitude`;
const DETAIL_COLS = `id, title, description, event_timestamp, created_at, location_name, source_tier,
  evidence_types, credibility_score, is_gov_declassified, media_gallery, document_vault_url,
  latitude, longitude`;
const HOTSPOT_COLS = 'id, location_name, sighting_count, severity_level, last_detected_at, latitude, longitude';

type Row = Record<string, unknown>;

/** Bulk feed for the globe, newest first. `since` returns only newer inserts (polling). */
export async function listSightings(opts: { limit: number; since?: string | null }): Promise<Row[]> {
  const sql = getDb();
  if (opts.since) {
    return sql.unsafe(
      `SELECT ${LIST_COLS} FROM v_uap_sightings WHERE created_at > $1 ORDER BY created_at DESC LIMIT $2`,
      [opts.since, opts.limit],
    );
  }
  return sql.unsafe(
    `SELECT ${LIST_COLS} FROM v_uap_sightings ORDER BY event_timestamp DESC LIMIT $1`,
    [opts.limit],
  );
}

export async function getSighting(id: string): Promise<Row | null> {
  const rows = await getDb().unsafe(`SELECT ${DETAIL_COLS} FROM v_uap_sightings WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listHotspots(limit: number): Promise<Row[]> {
  return getDb().unsafe(
    `SELECT ${HOTSPOT_COLS} FROM v_hotspot_alerts ORDER BY last_detected_at DESC LIMIT $1`,
    [limit],
  );
}

/** Filtered search used by GET /api/sightings (bbox / time / credibility / text). */
export async function searchSightings(f: {
  minLat: number | null;
  minLng: number | null;
  maxLat: number | null;
  maxLng: number | null;
  start: string | null;
  end: string | null;
  minCredibility: number | null;
  q: string | null;
  limit: number;
}): Promise<Row[]> {
  const sql = getDb();
  const bbox = f.minLat !== null && f.minLng !== null && f.maxLat !== null && f.maxLng !== null;
  return sql`
    SELECT s.id, s.title, s.event_timestamp, s.location_name, s.source_tier, s.evidence_types,
           s.credibility_score,
           ST_Y(s.location_coordinates::geometry) AS latitude,
           ST_X(s.location_coordinates::geometry) AS longitude
    FROM uap_sightings s
    WHERE ${bbox ? sql`s.location_coordinates && ST_MakeEnvelope(${f.minLng}, ${f.minLat}, ${f.maxLng}, ${f.maxLat}, 4326)::geography` : sql`TRUE`}
      AND ${f.start ? sql`s.event_timestamp >= ${f.start}` : sql`TRUE`}
      AND ${f.end ? sql`s.event_timestamp <= ${f.end}` : sql`TRUE`}
      AND ${f.minCredibility !== null ? sql`s.credibility_score >= ${f.minCredibility}` : sql`TRUE`}
      AND ${f.q ? sql`(s.title ILIKE ${'%' + f.q + '%'} OR s.location_name ILIKE ${'%' + f.q + '%'})` : sql`TRUE`}
    ORDER BY s.event_timestamp DESC
    LIMIT ${f.limit}
  `;
}

/* --- community ----------------------------------------------------------- */

export async function listThreads(sightingId: string, since?: string | null): Promise<Row[]> {
  const sql = getDb();
  return sql`
    SELECT id, sighting_id, parent_id, operator_handle, intel_text, created_at
    FROM uap_intel_threads
    WHERE sighting_id = ${sightingId}
      AND ${since ? sql`created_at > ${since}` : sql`TRUE`}
    ORDER BY created_at ASC
  `;
}

export async function insertThread(t: {
  sightingId: string;
  parentId: string | null;
  handle: string;
  text: string;
}): Promise<Row> {
  const [row] = await getDb()`
    INSERT INTO uap_intel_threads (sighting_id, parent_id, operator_handle, intel_text)
    VALUES (${t.sightingId}, ${t.parentId}, ${t.handle}, ${t.text})
    RETURNING id, sighting_id, parent_id, operator_handle, intel_text, created_at
  `;
  return row;
}

export async function getBrief(sightingId: string): Promise<Row | null> {
  const rows = await getDb()`
    SELECT summary_text, threat_assessment FROM uap_ai_briefs WHERE sighting_id = ${sightingId}
  `;
  return rows[0] ?? null;
}

export async function upsertBrief(sightingId: string, summary: string, threat: string): Promise<void> {
  await getDb()`
    INSERT INTO uap_ai_briefs (sighting_id, summary_text, threat_assessment, updated_at)
    VALUES (${sightingId}, ${summary}, ${threat}, now())
    ON CONFLICT (sighting_id) DO UPDATE
      SET summary_text = EXCLUDED.summary_text,
          threat_assessment = EXCLUDED.threat_assessment,
          updated_at = now()
  `;
}

export async function countCoWitnesses(sightingId: string): Promise<number> {
  const [r] = await getDb()`SELECT count(*)::int AS n FROM sighting_co_witnesses WHERE sighting_id = ${sightingId}`;
  return Number(r?.n ?? 0);
}

export async function insertCoWitness(sightingId: string, handle: string): Promise<void> {
  await getDb()`INSERT INTO sighting_co_witnesses (sighting_id, operator_handle) VALUES (${sightingId}, ${handle})`;
}

export async function insertUpvote(sightingId: string, handle: string): Promise<void> {
  await getDb()`INSERT INTO uap_intel_upvotes (sighting_id, operator_handle) VALUES (${sightingId}, ${handle})`;
}

export async function trending(maxRows: number): Promise<Row[]> {
  return getDb()`SELECT id, title, upvote_count::int AS upvote_count FROM trending_sightings(${maxRows})`;
}

/** Intel feed: recent sightings with thread + upvote counts. */
export async function feedItems(limit: number): Promise<Row[]> {
  return getDb()`
    SELECT s.id, s.title, s.description, s.event_timestamp, s.location_name,
           s.is_gov_declassified, s.credibility_score,
           (SELECT count(*)::int FROM uap_intel_threads t WHERE t.sighting_id = s.id) AS thread_count,
           (SELECT count(*)::int FROM uap_intel_upvotes u WHERE u.sighting_id = s.id) AS upvote_count
    FROM uap_sightings s
    ORDER BY s.event_timestamp DESC
    LIMIT ${limit}
  `;
}

/* --- verification write path -------------------------------------------- */

export async function insertVerifiedSighting(s: {
  title: string;
  description: string;
  eventTimestamp: string;
  latitude: number;
  longitude: number;
  locationName: string;
  sourceTier: string;
  evidenceTypes: string[];
  credibility: number;
  mediaAssets: unknown[];
  log: {
    exif: unknown;
    isMetadataAuthentic: boolean;
    syntheticConfidence: number;
    aircraftInProximity: number;
    satelliteConjunction: boolean;
    weatherSummary: string | null;
  };
}): Promise<string> {
  const sql = getDb();
  // One transaction: the sighting and its forensic audit row land together.
  return sql.begin(async (tx) => {
    const [row] = await tx`
      INSERT INTO uap_sightings
        (title, description, event_timestamp, location_coordinates, location_name,
         source_tier, evidence_types, credibility_score, media_assets)
      VALUES (${s.title}, ${s.description}, ${s.eventTimestamp},
              ST_SetSRID(ST_MakePoint(${s.longitude}, ${s.latitude}), 4326)::geography,
              ${s.locationName}, ${s.sourceTier}::classification_tier,
              ${s.evidenceTypes}::sensor_evidence_type[], ${s.credibility},
              ${tx.json(s.mediaAssets as never)})
      RETURNING id
    `;
    await tx`
      INSERT INTO verification_logs
        (sighting_id, exif_data_extracted, is_metadata_authentic, synthetic_confidence_score,
         aircraft_in_proximity_count, satellite_conjunction, weather_condition_summary)
      VALUES (${row.id}, ${tx.json(s.log.exif as never)}, ${s.log.isMetadataAuthentic},
              ${s.log.syntheticConfidence}, ${s.log.aircraftInProximity},
              ${s.log.satelliteConjunction}, ${s.log.weatherSummary})
    `;
    return String(row.id);
  }) as Promise<string>;
}

/* --- profiles (Auth.js sign-in) ----------------------------------------- */

/**
 * Create or refresh an operator profile; returns the stored handle. If the
 * wanted handle is taken by someone else, a numeric suffix is appended.
 */
export async function upsertProfile(p: { id: string; handle: string; avatarUrl: string | null }): Promise<string> {
  const sql = getDb();
  const existing = await sql`SELECT operator_handle FROM profiles WHERE id = ${p.id}`;
  if (existing[0]) {
    await sql`UPDATE profiles SET avatar_url = ${p.avatarUrl} WHERE id = ${p.id}`;
    return String(existing[0].operator_handle);
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const handle = attempt === 0 ? p.handle : `${p.handle.slice(0, 20)}_${Math.floor(Math.random() * 9000 + 1000)}`;
    try {
      await sql`INSERT INTO profiles (id, operator_handle, avatar_url) VALUES (${p.id}, ${handle}, ${p.avatarUrl})`;
      return handle;
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== '23505') throw err;
    }
  }
  throw new Error('Could not allocate a unique operator handle.');
}

export async function getProfile(id: string): Promise<Row | null> {
  const rows = await getDb()`SELECT * FROM profiles WHERE id = ${id}`;
  return rows[0] ?? null;
}
