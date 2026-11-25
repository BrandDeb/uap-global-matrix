/**
 * scripts/dbMigrate.ts
 * ---------------------------------------------------------------------------
 * Applies db/schema.sql (idempotent) and, with `--seed`, db/seed.sql.
 *
 *   npm run db:migrate          # schema only
 *   npm run db:seed             # schema + demo cases (re-seeds seed rows)
 *   --seed-if-empty             # used by the Vercel build: schema, then seed
 *                               # ONLY if no seed rows exist yet (never wipes
 *                               # comments/votes on redeploy). Skips quietly
 *                               # when no DATABASE_URL is configured.
 *
 * Reads DATABASE_URL from the environment or .env.local.
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { ARCHIVE } from '../src/lib/archive';

for (const line of (existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  if (process.argv.includes('--seed-if-empty')) {
    console.log('[db] No DATABASE_URL — skipping migration (app will run in demo mode).');
    process.exit(0);
  }
  throw new Error('Missing DATABASE_URL (set it in .env.local).');
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

async function run(file: string) {
  const text = readFileSync(join(process.cwd(), 'db', file), 'utf8');
  await sql.unsafe(text).simple();
  console.log(`✓ applied db/${file}`);
}

async function main() {
  try {
    await run('schema.sql');
    if (process.argv.includes('--seed')) await run('seed.sql');
    // Curated archive: load once (stable ids). The first time it lands it
    // replaces the generic starter rows (source='seed').
    const [{ n: archived }] = await sql`SELECT count(*)::int AS n FROM uap_sightings WHERE source = 'archive'`;
    if (archived === 0) {
      await sql.begin(async (tx) => {
        await tx`ALTER TABLE uap_sightings DISABLE TRIGGER trg_sighting_cluster_sync`;
        await tx`DELETE FROM uap_sightings WHERE source = 'seed'`;
        for (const c of ARCHIVE) {
          await tx`
            INSERT INTO uap_sightings
              (id, title, description, event_timestamp, location_coordinates, location_name, source_tier,
               evidence_types, credibility_score, is_gov_declassified, document_vault_url, source,
               archive_source, document_id, craft_morphology, era_tag, primary_source_url)
            VALUES (${c.id}, ${c.title}, ${c.description}, ${c.eventTimestamp},
                    ST_SetSRID(ST_MakePoint(${c.longitude}, ${c.latitude}), 4326)::geography, ${c.locationName},
                    ${c.sourceTier}::classification_tier, ${c.evidenceTypes}::sensor_evidence_type[],
                    ${c.credibilityScore}, ${c.isGovDeclassified}, ${c.primarySourceUrl}, 'archive',
                    ${c.archiveSource}, ${c.documentId}, ${c.morphology}, ${c.era}, ${c.primarySourceUrl})
            ON CONFLICT (id) DO NOTHING`;
        }
        await tx`ALTER TABLE uap_sightings ENABLE TRIGGER trg_sighting_cluster_sync`;
      });
      console.log(`✓ loaded curated archive (${ARCHIVE.length} cases)`);
    }
    if (process.argv.includes('--seed-if-empty')) {
      const [{ n: seeded }] = await sql`SELECT count(*)::int AS n FROM uap_sightings WHERE source IN ('seed', 'archive')`;
      if (seeded === 0) await run('seed.sql');
      else console.log(`  seed rows already present (${seeded}) — leaving data untouched`);
    }
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM uap_sightings`;
    console.log(`  uap_sightings: ${n} rows`);
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
