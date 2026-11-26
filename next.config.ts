import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS project. Without it, Next infers the root
  // from the nearest lockfile and was picking up a stray
  // `C:\Users\levyb\package-lock.json` in a parent directory. An absolute
  // `turbopack.root` keeps module resolution + file watching scoped here.
  // Ref: next.config.js → turbopack → root (api-reference/config).
  turbopack: {
    root: __dirname,
  },
  poweredByHeader: false,
  async headers() {
    const csp = [
      "default-src 'self'",
      // Inline scripts: theme boot + JSON-LD + Next runtime. No third-party script hosts except Vercel analytics.
      "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "media-src 'self' data: blob:",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com https://github.com",
      'upgrade-insecure-requests',
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self), interest-cohort=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
  // Production only: send per-deployment URLs (uap-global-matrix-<hash>-...vercel.app)
  // to the main address so Google/GitHub sign-in callbacks always match.
  async redirects() {
    if (process.env.VERCEL_ENV !== 'production') return [];
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'uap-global-matrix-.+\\.vercel\\.app' }],
        destination: 'https://uap-global-matrix.vercel.app/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
