/** Canonical site URL (Vercel production URL when deployed). */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const SITE_NAME = 'UAP/MATRIX';
