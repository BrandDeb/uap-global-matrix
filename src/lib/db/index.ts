/**
 * src/lib/db/index.ts
 * ---------------------------------------------------------------------------
 * Server-only Postgres client (Neon or any Postgres + PostGIS), via the
 * `postgres` driver over TLS. One pooled client per server instance, reused
 * across hot reloads in development.
 *
 * DATABASE_URL — use Neon's *pooled* connection string in production
 * (host contains `-pooler`); `prepare: false` keeps it pgbouncer-compatible.
 * ---------------------------------------------------------------------------
 */
import 'server-only';
import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { __uapSql?: Sql };

export function getDb(): Sql {
  if (globalForDb.__uapSql) return globalForDb.__uapSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('[db] DATABASE_URL is not configured. See .env.example.');
  }
  const sql = postgres(url, {
    max: 5,
    prepare: false,
    idle_timeout: 20,
    // numeric → JS number (credibility scores are NUMERIC(5,2)).
    types: { numeric: { to: 1700, from: [1700], serialize: String, parse: Number } },
  });
  globalForDb.__uapSql = sql;
  return sql;
}

/** True when the error is a unique-constraint violation (duplicate vote, etc.). */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
