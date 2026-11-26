/**
 * src/proxy.ts, request guard for the API (runs before route handlers).
 *   - Cross-site write protection: POST/PUT/PATCH/DELETE to /api/* must come
 *     from this site's own origin (blocks CSRF and drive-by form posts).
 *   - Rejects oversized bodies early (Content-Length > 2 MB, uploads 6 MB).
 *   - Blocks obvious scanner probes (/.env, /wp-admin, .php…).
 * Auth.js callbacks (/api/auth/*) keep their own CSRF protection and are exempt.
 */
import { NextResponse, type NextRequest } from 'next/server';

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PROBE = /(^\/\.(env|git|aws|ssh)|wp-(admin|login|content)|\.php$|phpmyadmin|\/cgi-bin\/|\/\.well-known\/(?!security\.txt|apple|assetlinks))/i;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROBE.test(pathname)) return new NextResponse(null, { status: 404 });
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth/')) return NextResponse.next();

  if (WRITE.has(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    // Browsers always send Origin on cross-site writes; it must match our host.
    if (origin) {
      let ok = false;
      try {
        ok = new URL(origin).host === host;
      } catch {
        ok = false;
      }
      if (!ok) return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
    } else if (req.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
    }
    const len = Number(req.headers.get('content-length') ?? 0);
    const limit = pathname.startsWith('/api/sightings') || pathname.startsWith('/api/verify') ? 6_000_000 : 2_000_000;
    if (len > limit) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/.env', '/.git/:path*', '/wp-admin/:path*', '/wp-login.php', '/:path*.php'],
};
