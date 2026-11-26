import type { MetadataRoute } from 'next';
import { ARCHIVE, ERAS } from '@/lib/archive';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/archive`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/matrix`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/arcade`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/cards`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/keeper`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/comms`, lastModified: now, changeFrequency: 'hourly', priority: 0.6 },
    { url: `${SITE_URL}/play`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/pilots`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${SITE_URL}/daily`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/crop-circles`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/feed`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
  ];
  return [
    ...pages,
    ...ERAS.map((e) => ({ url: `${SITE_URL}/archive/${e.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...ARCHIVE.map((c) => ({ url: `${SITE_URL}/case/${c.id}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
