/**
 * scripts/megaImport.ts
 * ---------------------------------------------------------------------------
 * Bulk-ingests the NUFORC archive (planetsig/ufo-reports, ~80k geocoded
 * eyewitness reports) into `uap_sightings`, bounded to IMPORT_LIMIT rows.
 *
 * Corrections vs. the original blueprint:
 *   - Real, verified dataset URL (the blueprint's was a 404).
 *   - Headerless CSV parsed by column index (not named columns).
 *   - Valid `sensor_evidence_type` (the blueprint used 'OPTICAL_VISUAL', which
 *     is not in the enum and fails every insert). Eyewitness reports carry no
 *     sensor evidence, so the column is left to its '{}' default.
 *   - `SRID=4326;POINT(lng lat)` geography literal.
 *   - Rows tagged `source='nuforc'` for provenance + one-line revert
 *     (`DELETE FROM uap_sightings WHERE source='nuforc'`).
 *   - Idempotency guard: skips if an import already exists.
 *
 * Run AFTER disabling trg_sighting_cluster_sync. Usage: `npx tsx scripts/megaImport.ts`
 * ---------------------------------------------------------------------------
 */

import { createReadStream, createWriteStream, existsSync, readFileSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';

// --- env (load .env.local; Node doesn't do this automatically) -------------
for (const line of (existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // bypasses RLS for batch writes
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DATASET_URL =
  'https://raw.githubusercontent.com/planetsig/ufo-reports/master/csv-data/ufo-scrubbed-geocoded-time-standardized.csv';
const LOCAL_CSV = 'scripts/.cache/nuforc.csv';
const IMPORT_LIMIT = 10000;
const BATCH_SIZE = 500;

// Headerless column order in this dataset.
const COL = { datetime: 0, city: 1, state: 2, country: 3, shape: 4, comments: 7, lat: 9, lng: 10 } as const;

interface SightingRow {
  title: string;
  description: string;
  event_timestamp: string;
  location_name: string;
  location_coordinates: string;
  source_tier: 'CLASS_C';
  credibility_score: number;
  source: 'nuforc';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#44;/g, ',')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#33;/g, '!')
    .trim();
}

/** Crude credibility heuristic for unscored eyewitness data (documented guess). */
function credibilityForShape(shape: string): number {
  const s = shape.toLowerCase();
  if (/disk|circle|cylinder|cigar|triangle|sphere|egg|oval|diamond/.test(s)) return 50;
  if (/light|fireball|flash|flare|formation/.test(s)) return 35;
  return 42;
}

function parseEventDate(raw: string): string | null {
  if (!raw) return null;
  // NUFORC uses M/D/YYYY HH:MM; "24:00" is a known invalid quirk.
  const fixed = raw.replace(/\s24:00$/, ' 23:59');
  const d = new Date(fixed);
  const year = d.getFullYear();
  if (Number.isNaN(d.getTime()) || year < 1900 || year > 2026) return null;
  return d.toISOString();
}

async function ensureDataset(): Promise<void> {
  if (existsSync(LOCAL_CSV)) return;
  console.log('📥 downloading NUFORC archive…');
  const res = await fetch(DATASET_URL);
  if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(LOCAL_CSV));
}

async function run(): Promise<void> {
  console.log('⚡ NUFORC ingestion engine');

  const { count } = await supabase
    .from('uap_sightings')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'nuforc');
  if ((count ?? 0) > 0) {
    console.log(`⏭  ${count} 'nuforc' rows already present — skipping (revert with DELETE … WHERE source='nuforc').`);
    return;
  }

  await ensureDataset();

  const records: SightingRow[] = [];
  const parser = createReadStream(LOCAL_CSV).pipe(
    parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true }),
  );

  for await (const row of parser as AsyncIterable<string[]>) {
    if (records.length >= IMPORT_LIMIT) break;
    const lat = parseFloat(row[COL.lat]);
    const lng = parseFloat(row[COL.lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) continue;

    const eventTs = parseEventDate(row[COL.datetime]);
    if (!eventTs) continue;

    const shape = (row[COL.shape] || 'unknown').trim();
    const city = (row[COL.city] || '').trim();
    const region = [row[COL.state], row[COL.country]].filter(Boolean).join(', ').toUpperCase();
    const locationName = [city, region].filter(Boolean).join(', ') || 'Unknown locale';

    records.push({
      title: `${shape ? shape[0].toUpperCase() + shape.slice(1) : 'Unidentified'} — ${city || 'unknown'}`.slice(0, 200),
      description: decodeEntities(row[COL.comments] || '').slice(0, 600) || 'NUFORC archival eyewitness report.',
      event_timestamp: eventTs,
      location_name: locationName.slice(0, 200),
      location_coordinates: `SRID=4326;POINT(${lng} ${lat})`,
      source_tier: 'CLASS_C',
      credibility_score: credibilityForShape(shape),
      source: 'nuforc',
    });
  }

  console.log(`📦 prepared ${records.length} valid geocoded records`);

  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('uap_sightings').insert(batch);
    if (error) {
      console.error(`❌ batch @${i} failed: ${error.message}`);
    } else {
      inserted += batch.length;
      console.log(`🚀 synced ${inserted}/${records.length}`);
    }
  }

  console.log(`✨ done — ${inserted} rows ingested.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
