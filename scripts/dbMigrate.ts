/**
 * scripts/dbMigrate.ts
 * ---------------------------------------------------------------------------
 * Applies db/schema.sql (idempotent) and, with `--seed`, db/seed.sql.
 *
 *   npm run db:migrate          # schema only
 *   npm run db:seed             # schema + demo cases
 *
 * Reads DATABASE_URL from the environment or .env.local.
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

for (const line of (existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('Missing DATABASE_URL (set it in .env.local).');

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
