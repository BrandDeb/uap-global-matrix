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
