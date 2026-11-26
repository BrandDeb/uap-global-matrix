/**
 * src/lib/db/queries.ts
 * ---------------------------------------------------------------------------
 * Every SQL statement the app runs, in one place. Route handlers and server
 * components call these; client code calls the routes. Rows come back in the
 * same snake_case shape the decoders in `@/lib/sightings` already accept.
 *
 * When `DATABASE_URL` is not configured, falls back seamlessly to the in-memory
 * seed archive (`./demoStore`) so local development works immediately.
 * ---------------------------------------------------------------------------
 */
import 'server-only';
import { getDb, hasDb } from './index';
import {
  demoCountCoWitnesses,
  demoFeedItems,
  demoGetBrief,
  demoGetSighting,
  demoInsertCoWitness,
  demoInsertThread,
  demoInsertUpvote,
  demoInsertVerifiedSighting,
  demoListHotspots,
  demoListSightings,
  demoListThreads,
  demoSearchSightings,
  demoTrending,
  demoUpsertBrief,
} from './demoStore';

const LIST_COLS = `id, title, event_timestamp, location_name, source_tier, evidence_types,
  credibility_score, is_gov_declassified, latitude, longitude`;
const DETAIL_COLS = `id, title, description, event_timestamp, created_at, location_name, source_tier,
  evidence_types, credibility_score, is_gov_declassified, media_gallery, document_vault_url,
  latitude, longitude, archive_source, document_id, craft_morphology, era_tag, primary_source_url`;
const HOTSPOT_COLS = 'id, location_name, sighting_count, severity_level, last_detected_at, latitude, longitude';

type Row = Record<string, unknown>;

/** Bulk feed for the globe, newest first. `since` returns only newer inserts (polling). */
export async function listSightings(opts: { limit: number; since?: string | null }): Promise<Row[]> {
  if (!hasDb()) return demoListSightings(opts);
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
  if (!hasDb()) return demoGetSighting(id);
  const rows = await getDb().unsafe(`SELECT ${DETAIL_COLS} FROM v_uap_sightings WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listHotspots(limit: number): Promise<Row[]> {
  if (!hasDb()) return demoListHotspots(limit);
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
  if (!hasDb()) return demoSearchSightings(f);
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
  if (!hasDb()) return demoListThreads(sightingId, since);
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
  if (!hasDb()) return demoInsertThread(t);
  const [row] = await getDb()`
    INSERT INTO uap_intel_threads (sighting_id, parent_id, operator_handle, intel_text)
    VALUES (${t.sightingId}, ${t.parentId}, ${t.handle}, ${t.text})
    RETURNING id, sighting_id, parent_id, operator_handle, intel_text, created_at
  `;
  return row;
}

export async function getBrief(sightingId: string): Promise<Row | null> {
  if (!hasDb()) return demoGetBrief(sightingId);
  const rows = await getDb()`
    SELECT summary_text, threat_assessment FROM uap_ai_briefs WHERE sighting_id = ${sightingId}
  `;
  return rows[0] ?? null;
}

export async function upsertBrief(sightingId: string, summary: string, threat: string): Promise<void> {
  if (!hasDb()) {
    demoUpsertBrief(sightingId, summary, threat);
    return;
  }
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
  if (!hasDb()) return demoCountCoWitnesses(sightingId);
  const [r] = await getDb()`SELECT count(*)::int AS n FROM sighting_co_witnesses WHERE sighting_id = ${sightingId}`;
  return Number(r?.n ?? 0);
}

export async function insertCoWitness(sightingId: string, handle: string): Promise<void> {
  if (!hasDb()) {
    demoInsertCoWitness(sightingId, handle);
    return;
  }
  await getDb()`INSERT INTO sighting_co_witnesses (sighting_id, operator_handle) VALUES (${sightingId}, ${handle})`;
}

export async function insertUpvote(sightingId: string, handle: string): Promise<void> {
  if (!hasDb()) {
    demoInsertUpvote(sightingId, handle);
    return;
  }
  await getDb()`INSERT INTO uap_intel_upvotes (sighting_id, operator_handle) VALUES (${sightingId}, ${handle})`;
}

export async function trending(maxRows: number): Promise<Row[]> {
  if (!hasDb()) return demoTrending(maxRows);
  return getDb()`SELECT id, title, upvote_count::int AS upvote_count FROM trending_sightings(${maxRows})`;
}

/** Intel feed: recent sightings with thread + upvote counts. */
export async function feedItems(limit: number): Promise<Row[]> {
  if (!hasDb()) return demoFeedItems(limit);
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
  if (!hasDb()) return demoInsertVerifiedSighting(s);
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
const demoPrefs = new Map<string, Record<string, unknown>>();

export async function getPrefs(id: string): Promise<Record<string, unknown>> {
  if (!hasDb()) return demoPrefs.get(id) ?? {};
  const rows = await getDb()`SELECT prefs FROM profiles WHERE id = ${id}`;
  return (rows[0]?.prefs as Record<string, unknown>) ?? {};
}

export async function savePrefs(id: string, prefs: Record<string, unknown>): Promise<void> {
  if (!hasDb()) {
    demoPrefs.set(id, prefs);
    return;
  }
  const sql = getDb();
  await sql`UPDATE profiles SET prefs = ${sql.json(prefs as never)} WHERE id = ${id}`;
}

export async function upsertProfile(p: { id: string; handle: string; avatarUrl: string | null }): Promise<string> {
  if (!hasDb()) return p.handle; // demo mode: no persistence
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
  if (!hasDb()) return null;
  const rows = await getDb()`SELECT * FROM profiles WHERE id = ${id}`;
  return rows[0] ?? null;
}

/* --- arcade leaderboards ------------------------------------------------- */

const demoScores: { game: string; handle: string; score: number; created_at: string }[] = [];

/** Best score per handle for a game; `weekly` = since Monday 00:00 UTC. */
export async function topScores(game: string, weekly: boolean, limit = 10): Promise<Row[]> {
  if (!hasDb()) {
    const since = weekly ? weekStartIso() : '';
    const best = new Map<string, Row>();
    for (const s of demoScores) {
      if (s.game !== game || s.created_at < since) continue;
      const cur = best.get(s.handle);
      if (!cur || Number(cur.score) < s.score) best.set(s.handle, { handle: s.handle, score: s.score });
    }
    return [...best.values()].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, limit);
  }
  const sql = getDb();
  return sql`
    SELECT handle, max(score)::int AS score
    FROM arcade_scores
    WHERE game = ${game} AND ${weekly ? sql`created_at >= date_trunc('week', now())` : sql`TRUE`}
    GROUP BY handle
    ORDER BY score DESC
    LIMIT ${limit}
  `;
}

/** Last completed week's top 3 for a game (the prize podium). */
export async function lastWeekPodium(game: string): Promise<Row[]> {
  if (!hasDb()) {
    const end = weekStartIso();
    const start = new Date(new Date(end).getTime() - 7 * 86_400_000).toISOString();
    const best = new Map<string, Row>();
    for (const s of demoScores) {
      if (s.game !== game || s.created_at < start || s.created_at >= end) continue;
      const cur = best.get(s.handle);
      if (!cur || Number(cur.score) < s.score) best.set(s.handle, { handle: s.handle, score: s.score });
    }
    return [...best.values()].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 3);
  }
  return getDb()`
    SELECT handle, max(score)::int AS score
    FROM arcade_scores
    WHERE game = ${game}
      AND created_at >= date_trunc('week', now()) - interval '1 week'
      AND created_at < date_trunc('week', now())
    GROUP BY handle
    ORDER BY score DESC
    LIMIT 3
  `;
}

export async function insertScore(game: string, handle: string, score: number): Promise<void> {
  if (!hasDb()) {
    demoScores.push({ game, handle, score, created_at: new Date().toISOString() });
    return;
  }
  await getDb()`INSERT INTO arcade_scores (game, handle, score) VALUES (${game}, ${handle}, ${score})`;
}

function weekStartIso(): string {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString();
}

/* --- daily challenge ------------------------------------------------------ */

const demoDaily: { day: number; handle: string; guess: string; correct: boolean; streak: number }[] = [];

export async function saveDailyGuess(g: { day: number; handle: string; guess: string; correct: boolean; streak: number }): Promise<boolean> {
  if (!hasDb()) {
    if (demoDaily.some((d) => d.day === g.day && d.handle === g.handle)) return false;
    demoDaily.push(g);
    return true;
  }
  const rows = await getDb()`
    INSERT INTO daily_guesses (day, handle, guess, correct, streak)
    VALUES (${g.day}, ${g.handle}, ${g.guess}, ${g.correct}, ${g.streak})
    ON CONFLICT (day, handle) DO NOTHING RETURNING day`;
  return rows.length > 0;
}

/** Today's guess split + the longest live streaks. */
export async function dailyStats(day: number): Promise<{ split: Record<string, number>; total: number; streaks: { handle: string; streak: number }[] }> {
  if (!hasDb()) {
    const today = demoDaily.filter((d) => d.day === day);
    const split: Record<string, number> = {};
    for (const d of today) split[d.guess] = (split[d.guess] ?? 0) + 1;
    const streaks = demoDaily.filter((d) => d.day >= day - 1).sort((a, b) => b.streak - a.streak).slice(0, 10);
    return { split, total: today.length, streaks: streaks.map(({ handle, streak }) => ({ handle, streak })) };
  }
  const sql = getDb();
  const [splitRows, streakRows] = await Promise.all([
    sql`SELECT guess, count(*)::int AS n FROM daily_guesses WHERE day = ${day} GROUP BY guess`,
    sql`SELECT DISTINCT ON (handle) handle, streak FROM daily_guesses WHERE day >= ${day - 1} AND correct ORDER BY handle, day DESC`,
  ]);
  const split: Record<string, number> = {};
  let total = 0;
  for (const r of splitRows) {
    split[String(r.guess)] = Number(r.n);
    total += Number(r.n);
  }
  const streaks = streakRows
    .map((r) => ({ handle: String(r.handle), streak: Number(r.streak) }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 10);
  return { split, total, streaks };
}

/* --- crop circle gallery -------------------------------------------------- */

export interface CropRow {
  id: string;
  handle: string;
  field: string;
  likes: number;
  created_at: string;
}
const demoCrops: (CropRow & { image: Buffer })[] = [];

export async function insertCrop(c: { id: string; handle: string; field: string; image: Buffer }) {
  if (!hasDb()) {
    demoCrops.unshift({ ...c, likes: 0, created_at: new Date().toISOString() });
    return;
  }
  await getDb()`INSERT INTO crop_circles (id, handle, field, image) VALUES (${c.id}, ${c.handle}, ${c.field}, ${c.image})`;
}

export async function listCrops(sort: 'top' | 'new', limit = 48): Promise<CropRow[]> {
  if (!hasDb()) {
    const rows = [...demoCrops].sort((a, b) => (sort === 'top' ? b.likes - a.likes : 0) || b.created_at.localeCompare(a.created_at));
    return rows.slice(0, limit).map((r) => ({ id: r.id, handle: r.handle, field: r.field, likes: r.likes, created_at: r.created_at }));
  }
  const sql = getDb();
  return sql<CropRow[]>`
    SELECT id, handle, field, likes, created_at FROM crop_circles
    ORDER BY ${sort === 'top' ? sql`likes DESC, created_at DESC` : sql`created_at DESC`}
    LIMIT ${limit}`;
}

export async function getCrop(id: string): Promise<CropRow | null> {
  if (!hasDb()) {
    const c = demoCrops.find((x) => x.id === id);
    if (!c) return null;
    return { id: c.id, handle: c.handle, field: c.field, likes: c.likes, created_at: c.created_at };
  }
  const rows = await getDb()<CropRow[]>`SELECT id, handle, field, likes, created_at FROM crop_circles WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function getCropImage(id: string): Promise<Buffer | null> {
  if (!hasDb()) return demoCrops.find((x) => x.id === id)?.image ?? null;
  const rows = await getDb()`SELECT image FROM crop_circles WHERE id = ${id}`;
  return (rows[0]?.image as Buffer | undefined) ?? null;
}

export async function likeCrop(id: string): Promise<number | null> {
  if (!hasDb()) {
    const c = demoCrops.find((x) => x.id === id);
    if (!c) return null;
    c.likes += 1;
    return c.likes;
  }
  const rows = await getDb()`UPDATE crop_circles SET likes = likes + 1 WHERE id = ${id} RETURNING likes`;
  return rows[0] ? Number(rows[0].likes) : null;
}

/* --- nearby alerts --------------------------------------------------------- */

/** New citizen reports since `since` within `km` of a point (newest first). */
export async function nearbySince(lat: number, lon: number, km: number, since: string): Promise<{ id: string; title: string; location_name: string; km: number }[]> {
  if (!hasDb()) return [];
  return getDb()`
    SELECT id, title, location_name,
           round((ST_Distance(location_coordinates, ST_MakePoint(${lon}, ${lat})::geography) / 1000)::numeric, 0)::int AS km
    FROM uap_sightings
    WHERE source = 'citizen' AND NOT is_gov_declassified
      AND created_at > ${since}::timestamptz
      AND ST_DWithin(location_coordinates, ST_MakePoint(${lon}, ${lat})::geography, ${km * 1000})
    ORDER BY created_at DESC
    LIMIT 5
  ` as unknown as Promise<{ id: string; title: string; location_name: string; km: number }[]>;
}

/* --- public pilots ------------------------------------------------------- */

export interface PilotRow {
  id: string;
  operator_handle: string;
  avatar_url: string | null;
  prefs: Record<string, unknown>;
  created_at: string;
}

export async function pilotByHandle(handle: string): Promise<PilotRow | null> {
  if (!hasDb()) return null;
  const rows = await getDb()<PilotRow[]>`SELECT id, operator_handle, avatar_url, prefs, created_at FROM profiles WHERE lower(operator_handle) = lower(${handle})`;
  return rows[0] ?? null;
}

export async function recentPilots(limit = 200): Promise<PilotRow[]> {
  if (!hasDb()) return [];
  return getDb()<PilotRow[]>`SELECT id, operator_handle, avatar_url, prefs, created_at FROM profiles ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function cropsByHandle(handle: string, limit = 12): Promise<CropRow[]> {
  if (!hasDb()) return [];
  return getDb()<CropRow[]>`SELECT id, handle, field, likes, created_at FROM crop_circles WHERE lower(handle) = lower(${handle}) ORDER BY created_at DESC LIMIT ${limit}`;
}

/* --- comms ------------------------------------------------------------------ */

export interface CommsMsg {
  id: number;
  room: string;
  handle: string;
  body: string;
  created_at: string;
}

export async function commsList(room: string, after = 0): Promise<CommsMsg[]> {
  if (!hasDb()) return [];
  const rows = await getDb()<CommsMsg[]>`
    SELECT id::int, room, handle, body, created_at FROM comms_messages
    WHERE room = ${room} AND NOT hidden AND id > ${after}
    ORDER BY id DESC LIMIT 60`;
  return rows.reverse();
}

export async function commsInsert(m: { room: string; userId: string; handle: string; body: string }): Promise<number> {
  if (!hasDb()) return 0;
  const rows = await getDb()`INSERT INTO comms_messages (room, user_id, handle, body) VALUES (${m.room}, ${m.userId}, ${m.handle}, ${m.body}) RETURNING id::int`;
  return Number(rows[0].id);
}

export async function commsRecentCount(userId: string, seconds: number): Promise<number> {
  if (!hasDb()) return 0;
  const rows = await getDb()`SELECT count(*)::int AS n FROM comms_messages WHERE user_id = ${userId} AND created_at > now() - make_interval(secs => ${seconds})`;
  return Number(rows[0].n);
}

export async function standing(userId: string): Promise<{ strikes: number; banned: boolean }> {
  if (!hasDb()) return { strikes: 0, banned: false };
  const rows = await getDb()`SELECT strikes, banned FROM user_standing WHERE user_id = ${userId}`;
  return rows[0] ? { strikes: Number(rows[0].strikes), banned: Boolean(rows[0].banned) } : { strikes: 0, banned: false };
}

/** Add a strike (or ban outright). Bans at 3 strikes. */
export async function strike(userId: string, reason: string, ban = false): Promise<{ strikes: number; banned: boolean }> {
  if (!hasDb()) return { strikes: 1, banned: ban };
  const rows = await getDb()`
    INSERT INTO user_standing (user_id, strikes, banned, reason) VALUES (${userId}, 1, ${ban}, ${reason})
    ON CONFLICT (user_id) DO UPDATE SET
      strikes = user_standing.strikes + 1,
      banned = user_standing.banned OR ${ban} OR user_standing.strikes + 1 >= 3,
      reason = ${reason}, updated_at = now()
    RETURNING strikes, banned`;
  return { strikes: Number(rows[0].strikes), banned: Boolean(rows[0].banned) };
}

/** Report a message; 3 distinct reporters hide it. */
export async function commsReport(id: number, reporter: string): Promise<void> {
  if (!hasDb()) return;
  const sql = getDb();
  await sql`INSERT INTO comms_reports (message_id, reporter) VALUES (${id}, ${reporter}) ON CONFLICT DO NOTHING`;
  await sql`UPDATE comms_messages SET hidden = true WHERE id = ${id} AND (SELECT count(*) FROM comms_reports WHERE message_id = ${id}) >= 3`;
}

/* --- card teams (async PvP) -------------------------------------------------- */

export async function saveTeam(t: { userId: string; handle: string; team: unknown; power: number }) {
  if (!hasDb()) return;
  const sql = getDb();
  await sql`
    INSERT INTO card_teams (user_id, handle, team, power) VALUES (${t.userId}, ${t.handle}, ${sql.json(t.team as never)}, ${t.power})
    ON CONFLICT (user_id) DO UPDATE SET handle = ${t.handle}, team = ${sql.json(t.team as never)}, power = ${t.power}, updated_at = now()`;
}

export async function findOpponent(userId: string, power: number): Promise<{ handle: string; team: unknown; rating: number } | null> {
  if (!hasDb()) return null;
  const rows = await getDb()`
    SELECT handle, team, rating FROM card_teams
    WHERE user_id <> ${userId}
    ORDER BY abs(power - ${power}) + random() * 400 LIMIT 1`;
  return rows[0] ? { handle: String(rows[0].handle), team: rows[0].team, rating: Number(rows[0].rating) } : null;
}

export async function adjustRating(userId: string, delta: number): Promise<number | null> {
  if (!hasDb()) return null;
  const rows = await getDb()`UPDATE card_teams SET rating = greatest(0, rating + ${delta}) WHERE user_id = ${userId} RETURNING rating`;
  return rows[0] ? Number(rows[0].rating) : null;
}

export async function topTeams(limit = 20): Promise<{ handle: string; rating: number; power: number }[]> {
  if (!hasDb()) return [];
  return getDb()`SELECT handle, rating, power FROM card_teams ORDER BY rating DESC LIMIT ${limit}` as unknown as Promise<{ handle: string; rating: number; power: number }[]>;
}

/** Change a pilot's public handle. Returns false if taken. */
export async function renameHandle(id: string, handle: string): Promise<boolean> {
  if (!hasDb()) return true;
  try {
    const rows = await getDb()`UPDATE profiles SET operator_handle = ${handle} WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') return false;
    throw err;
  }
}
