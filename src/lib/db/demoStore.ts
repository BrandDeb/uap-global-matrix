/**
 * src/lib/db/demoStore.ts
 * ---------------------------------------------------------------------------
 * Server-only in-memory seed store mirroring `db/seed.sql` + `db/schema.sql`.
 * Used automatically when `DATABASE_URL` is not configured so a fresh local
 * `npm run dev` boots with all 28 documented UAP cases, active hotspot flaps,
 * operator threads, upvotes, and live sighting submissions working out of the
 * box without 502 errors.
 * ---------------------------------------------------------------------------
 */
import 'server-only';
import { randomUUID } from 'node:crypto';

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

const SEED_CASES: ReadonlyArray<
  [
    title: string,
    description: string,
    eventTimestamp: string,
    lng: number,
    lat: number,
    locationName: string,
    tier: string,
    evidence: string[],
    credibility: number,
    gov: boolean,
  ]
> = [
  [
    'Roswell Debris Recovery',
    'Rancher reports unusual debris field; USAAF press release announces a recovered "flying disc", retracted within a day as a weather balloon.',
    '1947-07-08T14:00:00Z',
    -104.523,
    33.3943,
    'Roswell, New Mexico, USA',
    'CLASS_B',
    [],
    71,
    true,
  ],
  [
    'Kenneth Arnold Sighting',
    'Private pilot reports nine bright objects moving "like a saucer skipped across water" near Mount Rainier at an estimated 1,200 mph.',
    '1947-06-24T21:00:00Z',
    -121.7603,
    46.8523,
    'Mount Rainier, Washington, USA',
    'CLASS_B',
    [],
    68,
    false,
  ],
  [
    'Washington D.C. Flyover',
    'Multiple radar returns over restricted airspace near the Capitol on consecutive weekends; jets scrambled, visual contact reported.',
    '1952-07-19T23:40:00Z',
    -77.0365,
    38.8977,
    'Washington, D.C., USA',
    'CLASS_A',
    ['RADAR_VISUAL'],
    86,
    true,
  ],
  [
    'Levelland Engine Failures',
    'Several motorists report a glowing egg-shaped object; vehicle engines and headlights fail as it approaches.',
    '1957-11-02T23:00:00Z',
    -102.3488,
    33.5873,
    'Levelland, Texas, USA',
    'CLASS_C',
    [],
    58,
    true,
  ],
  [
    'Socorro Landing Trace',
    'Police officer witnesses an oval craft with two small figures; landing impressions and scorched vegetation documented.',
    '1964-04-24T17:45:00Z',
    -106.8908,
    34.0584,
    'Socorro, New Mexico, USA',
    'CLASS_B',
    ['OPTICAL_PHOTO'],
    74,
    true,
  ],
  [
    'Westall School Encounter',
    'Over 200 students and staff observe a disc descend into a nearby paddock before departing at speed.',
    '1966-04-06T11:00:00Z',
    145.13,
    -37.94,
    'Westall, Victoria, Australia',
    'CLASS_B',
    [],
    70,
    false,
  ],
  [
    'Malmstrom Missile Shutdown',
    'Security personnel report a glowing red object over the launch facility as ICBMs go offline.',
    '1967-03-16T08:00:00Z',
    -111.183,
    47.505,
    'Malmstrom AFB, Montana, USA',
    'CLASS_B',
    ['RADAR_VISUAL'],
    69,
    true,
  ],
  [
    'Tehran F-4 Intercept',
    'Imperial Iranian Air Force F-4s lose instruments and weapons systems when approaching a brilliant object.',
    '1976-09-19T00:30:00Z',
    51.389,
    35.6892,
    'Tehran, Iran',
    'CLASS_A',
    ['RADAR_VISUAL'],
    84,
    true,
  ],
  [
    'Rendlesham Forest Incident',
    'USAF personnel investigate lights in the forest near RAF Woodbridge; a triangular craft and ground impressions are reported.',
    '1980-12-26T03:00:00Z',
    1.433,
    52.087,
    'Rendlesham Forest, Suffolk, UK',
    'CLASS_A',
    [],
    81,
    true,
  ],
  [
    'Trans-en-Provence Trace',
    'Farmer reports a craft landing; French GEPAN analysis finds altered soil and plant chlorophyll at the site.',
    '1981-01-08T17:00:00Z',
    6.35,
    43.504,
    'Trans-en-Provence, France',
    'CLASS_B',
    [],
    73,
    true,
  ],
  [
    'Hudson Valley Boomerang',
    'Thousands of residents report a huge silent boomerang of lights drifting over the valley over several years.',
    '1984-03-24T21:00:00Z',
    -73.9,
    41.5,
    'Hudson Valley, New York, USA',
    'CLASS_C',
    ['OPTICAL_PHOTO'],
    55,
    false,
  ],
  [
    'JAL Flight 1628',
    'Cargo 747 crew tracks enormous lights pacing the aircraft over Alaska; FAA radar shows intermittent returns.',
    '1986-11-17T02:00:00Z',
    -146.0,
    64.0,
    'Fort Yukon, Alaska, USA',
    'CLASS_A',
    ['RADAR_VISUAL'],
    80,
    true,
  ],
  [
    'Belgian Triangle Wave',
    'Belgian Air Force F-16s lock onto fast-maneuvering targets after hundreds of reports of silent black triangles.',
    '1990-03-30T23:00:00Z',
    4.3517,
    50.8503,
    'Brussels region, Belgium',
    'CLASS_A',
    ['RADAR_VISUAL', 'OPTICAL_PHOTO'],
    83,
    true,
  ],
  [
    'Ariel School Landing',
    'Sixty-two schoolchildren describe a craft landing near the playground and small beings approaching.',
    '1994-09-16T10:00:00Z',
    31.04,
    -17.73,
    'Ruwa, Zimbabwe',
    'CLASS_C',
    [],
    62,
    false,
  ],
  [
    'Varginha Incident',
    'Witnesses report a crashed craft and a strange creature; heavy military movement reported in the town.',
    '1996-01-20T15:30:00Z',
    -45.43,
    -21.55,
    'Varginha, Minas Gerais, Brazil',
    'CLASS_C',
    [],
    52,
    false,
  ],
  [
    'Phoenix Lights',
    'A mile-wide V of lights passes silently over Arizona, seen by thousands including the state governor.',
    '1997-03-13T19:30:00Z',
    -112.074,
    33.4484,
    'Phoenix, Arizona, USA',
    'CLASS_B',
    ['OPTICAL_VIDEO'],
    76,
    false,
  ],
  [
    "O'Hare Airport Disc",
    'United Airlines staff report a dark metallic disc hovering over gate C17 before punching a hole through clouds.',
    '2006-11-07T16:15:00Z',
    -87.9073,
    41.9742,
    "Chicago O'Hare, Illinois, USA",
    'CLASS_B',
    [],
    66,
    false,
  ],
  [
    'Stephenville Lights',
    'Dozens of residents including a pilot report a mile-long object pursued by jets; FAA radar data later released.',
    '2008-01-08T18:15:00Z',
    -98.2023,
    32.2207,
    'Stephenville, Texas, USA',
    'CLASS_B',
    ['RADAR_VISUAL'],
    72,
    true,
  ],
  [
    'Nimitz "Tic Tac" Encounter',
    'USS Princeton radar tracks objects dropping 80,000 ft in seconds; F/A-18 pilots observe a white tic-tac shaped craft. FLIR1 video later released by the DoD.',
    '2004-11-14T14:00:00Z',
    -117.6,
    31.5,
    'Pacific Ocean, off Baja California',
    'CLASS_A',
    ['RADAR_VISUAL', 'FLIR_THERMAL', 'OPTICAL_VIDEO'],
    94,
    true,
  ],
  [
    'USS Roosevelt "Gimbal"',
    'F/A-18 ATFLIR captures a rotating object flying against the wind, part of a fleet reported by the aircrew.',
    '2015-01-21T09:00:00Z',
    -79.5,
    31.0,
    'Atlantic Ocean, off Jacksonville, Florida',
    'CLASS_A',
    ['FLIR_THERMAL', 'OPTICAL_VIDEO'],
    89,
    true,
  ],
  [
    'USS Roosevelt "GoFast"',
    'ATFLIR tracks a small object skimming low over the ocean at high apparent speed.',
    '2015-01-22T09:30:00Z',
    -79.2,
    31.3,
    'Atlantic Ocean, off Jacksonville, Florida',
    'CLASS_A',
    ['FLIR_THERMAL', 'OPTICAL_VIDEO'],
    82,
    true,
  ],
  [
    'USS Omaha Sphere',
    'Ship combat information center films a spherical object that descends into the sea; no debris recovered.',
    '2019-07-15T23:00:00Z',
    -117.8,
    32.6,
    'Pacific Ocean, off San Diego, California',
    'CLASS_A',
    ['RADAR_VISUAL', 'OPTICAL_VIDEO'],
    85,
    true,
  ],
  [
    'Lake Huron Octagon Shootdown',
    'NORAD tracks an octagonal object at 20,000 ft; it is shot down over the lake after a series of high-altitude intercepts.',
    '2023-02-12T19:42:00Z',
    -82.4,
    44.8,
    'Lake Huron, Michigan, USA',
    'CLASS_A',
    ['RADAR_VISUAL'],
    79,
    true,
  ],
  [
    'Hessdalen Valley Lights',
    'Recurring luminous phenomena photographed and instrumented by a long-running research station.',
    '1984-02-12T22:00:00Z',
    11.19,
    62.8,
    'Hessdalen, Norway',
    'CLASS_B',
    ['OPTICAL_PHOTO', 'RADAR_VISUAL'],
    77,
    false,
  ],
  [
    'Kaikoura Lights',
    'Argosy freight crew and a TV team film lights tracked on Wellington radar along the coast.',
    '1978-12-31T02:00:00Z',
    173.68,
    -42.4,
    'Kaikoura, New Zealand',
    'CLASS_B',
    ['RADAR_VISUAL', 'OPTICAL_VIDEO'],
    75,
    false,
  ],
  [
    'Shag Harbour Splashdown',
    'Witnesses see a lit object crash into the harbour; RCMP and navy divers search but recover nothing.',
    '1967-10-04T23:20:00Z',
    -65.72,
    43.5,
    'Shag Harbour, Nova Scotia, Canada',
    'CLASS_B',
    [],
    72,
    true,
  ],
  [
    'Colares Light Beams',
    'Brazilian Air Force "Operação Prato" documents lights firing beams at residents of the island.',
    '1977-10-20T21:00:00Z',
    -48.28,
    -0.93,
    'Colares, Pará, Brazil',
    'CLASS_B',
    ['OPTICAL_PHOTO'],
    67,
    true,
  ],
  [
    'Mexico City Eclipse Sightings',
    'During the total eclipse, many independent videos capture a stationary bright object near the sun.',
    '1991-07-11T20:00:00Z',
    -99.1332,
    19.4326,
    'Mexico City, Mexico',
    'CLASS_C',
    ['OPTICAL_VIDEO'],
    54,
    false,
  ],
];

function createInitialState(): DemoState {
  const bootTime = '2026-01-01T00:00:00.000Z';
  const sightings: SightingRecord[] = SEED_CASES.map((c, idx) => ({
    id: seedUuid(idx + 1),
    title: c[0],
    description: c[1],
    event_timestamp: c[2],
    created_at: bootTime,
    longitude: c[3],
    latitude: c[4],
    location_name: c[5],
    source_tier: c[6],
    evidence_types: [...c[7]],
    credibility_score: c[8],
    is_gov_declassified: c[9],
    media_gallery: [],
    document_vault_url: null,
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

  const nimitzId = seedUuid(19);
  const belgianId = seedUuid(13);
  const phoenixId = seedUuid(16);
  const gimbalId = seedUuid(20);

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
