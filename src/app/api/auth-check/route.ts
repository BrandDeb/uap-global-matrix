/**
 * Sign-in diagnostics: which auth env vars are present (never their values)
 * and the most recent Auth.js errors.
 */
import { getDb, hasDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function check(name: string) {
  const v = process.env[name];
  if (!v) return 'MISSING';
  const issues = [];
  if (v !== v.trim()) issues.push('has spaces/newlines at the ends');
  if (/^["']|["']$/.test(v.trim())) issues.push('wrapped in quotes');
  return issues.length ? `set (${v.length} chars) but ${issues.join(', ')}` : `ok (${v.length} chars)`;
}

export async function GET(req: Request) {
  const gid = process.env.AUTH_GOOGLE_ID ?? '';
  let recent: unknown = 'no database';
  if (hasDb()) {
    try {
      recent = await getDb()`select at, msg from auth_errors order by at desc limit 5`;
    } catch {
      recent = 'no errors logged yet';
    }
  }
  return Response.json({
    site_origin_seen: new URL(req.url).origin,
    expected_google_redirect: `${new URL(req.url).origin}/api/auth/callback/google`,
    AUTH_SECRET: check('AUTH_SECRET'),
    AUTH_GOOGLE_ID: check('AUTH_GOOGLE_ID'),
    google_id_ends_with: gid.trim().slice(-30),
    AUTH_GOOGLE_SECRET: check('AUTH_GOOGLE_SECRET'),
    AUTH_GITHUB_ID: check('AUTH_GITHUB_ID'),
    AUTH_GITHUB_SECRET: check('AUTH_GITHUB_SECRET'),
    AUTH_URL: process.env.AUTH_URL ?? 'not set (good)',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'not set (good)',
    recent_auth_errors: recent,
  });
}
