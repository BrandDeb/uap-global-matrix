import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Open to search engines AND AI answer engines (GEO) — the archive is meant to be cited. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'], allow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
