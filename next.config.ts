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
};

export default nextConfig;
