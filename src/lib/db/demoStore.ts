/**
 * src/lib/db/demoStore.ts
 * ---------------------------------------------------------------------------
 * Server-only in-memory store mirroring `db/schema.sql`. Used automatically
 * when `DATABASE_URL` is not configured so a fresh local `npm run dev` boots
 * with the curated declassified archive (`@/lib/archive`), hotspot flaps,
 * operator threads, upvotes, and live sighting submissions working out of the
 * box without 502 errors.
 * ---------------------------------------------------------------------------
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { ARCHIVE } from '@/lib/archive';

type Row = Record<string, unknown>;

interface SightingRecord {
  id: string;
  title: string;
  description: string;
  event_timestamp: string;
  created_at: string;
  location_name: string;
  source_tier: string;
  evidence_types: string[];
  credibility_score: number;
  is_gov_declassified: boolean;
  media_gallery: { url: string; type: string }[];
  document_vault_url: string | null;
  latitude: number;
  longitude: number;
  archive_source?: string;
  document_id?: string;
  craft_morphology?: string;
  era_tag?: string;
  primary_source_url?: string | null;
}

interface HotspotRecord {
  id: string;
  location_name: string;
  sighting_count: number;
  severity_level: 'ELEVATED' | 'CRITICAL_FLAP';
  last_detected_at: string;
  latitude: number;
  longitude: number;
}

interface ThreadRecord {
  id: string;
  sighting_id: string;
  parent_id: string | null;
  operator_handle: string;
  intel_text: string;
  created_at: string;
}

interface DemoState {
  sightings: SightingRecord[];
  hotspots: HotspotRecord[];
  threads: ThreadRecord[];
  coWitnesses: Map<string, Set<string>>;
  upvotes: Map<string, Set<string>>;
  briefs: Map<string, { summary_text: string; threat_assessment: string }>;
}

const seedUuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function createInitialState(): DemoState {
  // Demo mode serves the curated declassified archive (same ids as the DB seed).
  const sightings: SightingRecord[] = ARCHIVE.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    event_timestamp: c.eventTimestamp,
    created_at: c.eventTimestamp,
    location_name: c.locationName,
    source_tier: c.sourceTier,
    evidence_types: c.evidenceTypes,
    credibility_score: c.credibilityScore,
    is_gov_declassified: c.isGovDeclassified,
    media_gallery: [],
    document_vault_url: c.primarySourceUrl,
    latitude: c.latitude,
    longitude: c.longitude,
    archive_source: c.archiveSource,
    document_id: c.documentId,
    craft_morphology: c.morphology,
    era_tag: c.era,
    primary_source_url: c.primarySourceUrl,
  }));

  const now = Date.now();
  const hotspots: HotspotRecord[] = [
    {
      id: seedUuid(101),
      location_name: 'Brussels region, Belgium',
      sighting_count: 9,
      severity_level: 'CRITICAL_FLAP',
      last_detected_at: new Date(now - 15 * 60_000).toISOString(),
      latitude: 50.8503,
      longitude: 4.3517,
    },
    {
      id: seedUuid(102),
      location_name: 'Hudson Valley, New York, USA',
      sighting_count: 4,
      severity_level: 'ELEVATED',
      last_detected_at: new Date(now - 60 * 60_000).toISOString(),
      latitude: 41.5,
      longitude: -73.9,
    },
    {
      id: seedUuid(103),
      location_name: 'SOCAL / Baja Range',
      sighting_count: 5,
      severity_level: 'ELEVATED',
      last_detected_at: new Date(now - 2 * 3600_000).toISOString(),
      latitude: 32.05,
      longitude: -117.7,
    },
  ];

  const nimitzId = (sightings.find((x) => x.title.includes('Nimitz'))?.id ?? sightings[0].id);
  const belgianId = (sightings.find((x) => x.title.includes('Belgian'))?.id ?? sightings[0].id);
  const phoenixId = (sightings.find((x) => x.title.includes('Phoenix'))?.id ?? sightings[0].id);
  const gimbalId = (sightings.find((x) => x.title.includes('Gimbal'))?.id ?? sightings[0].id);

  const threads: ThreadRecord[] = [
    {
      id: seedUuid(201),
      sighting_id: nimitzId,
      parent_id: null,
      operator_handle: 'SPY1_RADAR_OPS',
      intel_text:
        'Princeton SPY-1 returns show descent from ~80k ft to sea level in under a second. No known propulsion fits.',
      created_at: new Date(now - 4 * 3600_000).toISOString(),
    },
    {
      id: seedUuid(202),
      sighting_id: nimitzId,
      parent_id: null,
      operator_handle: 'FLIR_ANALYST',
      intel_text: 'FLIR1 shows no visible exhaust plume or control surfaces. Thermal signature is uniform.',
      created_at: new Date(now - 3 * 3600_000).toISOString(),
    },
    {
      id: seedUuid(203),
      sighting_id: belgianId,
      parent_id: null,
      operator_handle: 'NATO_AIRDEF',
      intel_text: 'Dual ground radar + F-16 airborne lock recorded acceleration spikes exceeding 40G with zero sonic boom.',
      created_at: new Date(now - 2 * 3600_000).toISOString(),
    },
  ];

  const coWitnesses = new Map<string, Set<string>>([
    [nimitzId, new Set(['VFA41_LEAD', 'VFA41_WSO', 'USS_PRINCETON_CIC', 'HAWKEYE_E2C'])],
    [phoenixId, new Set(['AZ_OBS_01', 'AZ_OBS_02', 'AZ_OBS_03', 'PRESCOTT_TOWER', 'TUCSON_VISUAL'])],
    [belgianId, new Set(['WAVRE_GENDARMERIE', 'EBBE_F16_1', 'GLONS_CRC'])],
  ]);

  const upvotes = new Map<string, Set<string>>([
    [nimitzId, new Set(['op1', 'op2', 'op3', 'op4', 'op5', 'op6', 'op7'])],
    [gimbalId, new Set(['op1', 'op2', 'op3', 'op4', 'op5'])],
    [belgianId, new Set(['op1', 'op2', 'op3', 'op4'])],
    [phoenixId, new Set(['op1', 'op2', 'op3'])],
  ]);

  return {
    sightings,
    hotspots,
    threads,
    coWitnesses,
    upvotes,
    briefs: new Map(),
  };
}

const globalForDemo = globalThis as unknown as { __uapDemoState?: DemoState };

function getStore(): DemoState {
  if (!globalForDemo.__uapDemoState) {
    globalForDemo.__uapDemoState = createInitialState();
  }
  return globalForDemo.__uapDemoState;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function demoListSightings(opts: { limit: number; since?: string | null }): Row[] {
  const { sightings } = getStore();
  if (opts.since) {
    const t = new Date(opts.since).getTime();
    return sightings
      .filter((s) => new Date(s.created_at).getTime() > t)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, opts.limit)
      .map((s) => ({ ...s }));
  }
  return [...sightings]
    .sort((a, b) => b.event_timestamp.localeCompare(a.event_timestamp))
    .slice(0, opts.limit)
    .map((s) => ({ ...s }));
}

export function demoGetSighting(id: string): Row | null {
  const found = getStore().sightings.find((s) => s.id === id);
  return found ? { ...found } : null;
}

export function demoListHotspots(limit: number): Row[] {
  return [...getStore().hotspots]
    .sort((a, b) => b.last_detected_at.localeCompare(a.last_detected_at))
    .slice(0, limit)
    .map((h) => ({ ...h }));
}

export function demoSearchSightings(f: {
  minLat: number | null;
  minLng: number | null;
  maxLat: number | null;
  maxLng: number | null;
  start: string | null;
  end: string | null;
  minCredibility: number | null;
  q: string | null;
  limit: number;
}): Row[] {
  const bbox = f.minLat !== null && f.minLng !== null && f.maxLat !== null && f.maxLng !== null;
  const qLower = f.q?.toLowerCase() ?? null;
  return getStore()
    .sightings.filter((s) => {
      if (bbox && (s.latitude < f.minLat! || s.latitude > f.maxLat! || s.longitude < f.minLng! || s.longitude > f.maxLng!)) {
        return false;
      }
      if (f.start && s.event_timestamp < f.start) return false;
      if (f.end && s.event_timestamp > f.end) return false;
      if (f.minCredibility !== null && s.credibility_score < f.minCredibility) return false;
      if (qLower && !`${s.title} ${s.location_name}`.toLowerCase().includes(qLower)) return false;
      return true;
    })
    .sort((a, b) => b.event_timestamp.localeCompare(a.event_timestamp))
    .slice(0, f.limit)
    .map((s) => ({ ...s }));
}

export function demoListThreads(sightingId: string, since?: string | null): Row[] {
  const sinceMs = since ? new Date(since).getTime() : null;
  return getStore()
    .threads.filter((t) => {
      if (t.sighting_id !== sightingId) return false;
      if (sinceMs !== null && new Date(t.created_at).getTime() <= sinceMs) return false;
      return true;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((t) => ({ ...t }));
}

export function demoInsertThread(t: {
  sightingId: string;
  parentId: string | null;
  handle: string;
  text: string;
}): Row {
  const row: ThreadRecord = {
    id: randomUUID(),
    sighting_id: t.sightingId,
    parent_id: t.parentId,
    operator_handle: t.handle,
    intel_text: t.text,
    created_at: new Date().toISOString(),
  };
  getStore().threads.push(row);
  return { ...row };
}

export function demoGetBrief(sightingId: string): Row | null {
  const b = getStore().briefs.get(sightingId);
  return b ? { ...b } : null;
}

export function demoUpsertBrief(sightingId: string, summary: string, threat: string): void {
  getStore().briefs.set(sightingId, { summary_text: summary, threat_assessment: threat });
}

export function demoCountCoWitnesses(sightingId: string): number {
  return getStore().coWitnesses.get(sightingId)?.size ?? 0;
}

export function demoInsertCoWitness(sightingId: string, handle: string): void {
  const store = getStore();
  let set = store.coWitnesses.get(sightingId);
  if (!set) {
    set = new Set();
    store.coWitnesses.set(sightingId, set);
  }
  if (set.has(handle)) {
    throw Object.assign(new Error('Duplicate co-witness'), { code: '23505' });
  }
  set.add(handle);
}

export function demoInsertUpvote(sightingId: string, handle: string): void {
  const store = getStore();
  let set = store.upvotes.get(sightingId);
  if (!set) {
    set = new Set();
    store.upvotes.set(sightingId, set);
  }
  if (set.has(handle)) {
    throw Object.assign(new Error('Duplicate upvote'), { code: '23505' });
  }
  set.add(handle);
}

export function demoTrending(maxRows: number): Row[] {
  const store = getStore();
  return store.sightings
    .map((s) => ({
      id: s.id,
      title: s.title,
      upvote_count: store.upvotes.get(s.id)?.size ?? 0,
    }))
    .filter((x) => x.upvote_count > 0)
    .sort((a, b) => b.upvote_count - a.upvote_count || a.title.localeCompare(b.title))
    .slice(0, maxRows);
}

export function demoFeedItems(limit: number): Row[] {
  const store = getStore();
  return [...store.sightings]
    .sort((a, b) => b.event_timestamp.localeCompare(a.event_timestamp))
    .slice(0, limit)
    .map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      event_timestamp: s.event_timestamp,
      location_name: s.location_name,
      is_gov_declassified: s.is_gov_declassified,
      credibility_score: s.credibility_score,
      thread_count: store.threads.filter((t) => t.sighting_id === s.id).length,
      upvote_count: store.upvotes.get(s.id)?.size ?? 0,
    }));
}

export function demoInsertVerifiedSighting(s: {
  title: string;
  description: string;
  eventTimestamp: string;
  latitude: number;
  longitude: number;
  locationName: string;
  sourceTier: string;
  evidenceTypes: string[];
  credibility: number;
}): string {
  const store = getStore();
  const id = randomUUID();
  const nowIso = new Date().toISOString();
  const rec: SightingRecord = {
    id,
    title: s.title,
    description: s.description,
    event_timestamp: s.eventTimestamp,
    created_at: nowIso,
    location_name: s.locationName,
    source_tier: s.sourceTier,
    evidence_types: [...s.evidenceTypes],
    credibility_score: s.credibility,
    is_gov_declassified: false,
    media_gallery: [],
    document_vault_url: null,
    latitude: s.latitude,
    longitude: s.longitude,
  };
  store.sightings.unshift(rec);

  // Mirror `sync_hotspot_cluster()` trigger (>= 3 within 50 km & 72 h).
  const eventMs = new Date(s.eventTimestamp).getTime();
  const windowMs = 72 * 3600_000;
  const n = store.sightings.filter(
    (other) =>
      Math.abs(new Date(other.event_timestamp).getTime() - eventMs) <= windowMs &&
      haversineMeters(other.latitude, other.longitude, s.latitude, s.longitude) <= 50_000,
  ).length;
  if (n >= 3) {
    const existing = store.hotspots.find(
      (h) => haversineMeters(h.latitude, h.longitude, s.latitude, s.longitude) <= 50_000,
    );
    const severity = n >= 6 ? 'CRITICAL_FLAP' : 'ELEVATED';
    if (existing) {
      existing.sighting_count = n;
      existing.severity_level = severity;
      existing.last_detected_at = nowIso;
    } else {
      store.hotspots.unshift({
        id: randomUUID(),
        location_name: s.locationName,
        sighting_count: n,
        severity_level: severity,
        last_detected_at: nowIso,
        latitude: s.latitude,
        longitude: s.longitude,
      });
    }
  }
  return id;
}
