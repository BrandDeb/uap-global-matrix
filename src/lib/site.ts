/** Canonical site URL (Vercel production URL when deployed). */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const SITE_NAME = 'UAP/MATRIX';

export const SITE_DESCRIPTION =
  'A live 3D atlas of UFO and UAP sightings since 1942: a declassified case archive, a forensic credibility index, community reports and an original UFO arcade.';

/**
 * Official social profiles. Fill these in (or set the NEXT_PUBLIC_SOCIAL_*
 * env vars in Vercel) and they appear in the footer, in schema.org `sameAs`
 * (which helps search and AI engines link the brand), and in Twitter cards.
 */
export const SOCIALS: { id: string; label: string; url: string }[] = [
  { id: 'x', label: 'X', url: process.env.NEXT_PUBLIC_SOCIAL_X ?? '' },
  { id: 'tiktok', label: 'TikTok', url: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK ?? '' },
  { id: 'instagram', label: 'Instagram', url: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? '' },
  { id: 'facebook', label: 'Facebook', url: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? '' },
  { id: 'youtube', label: 'YouTube', url: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? '' },
  { id: 'threads', label: 'Threads', url: process.env.NEXT_PUBLIC_SOCIAL_THREADS ?? '' },
  { id: 'bluesky', label: 'Bluesky', url: process.env.NEXT_PUBLIC_SOCIAL_BLUESKY ?? '' },
  { id: 'reddit', label: 'Reddit', url: process.env.NEXT_PUBLIC_SOCIAL_REDDIT ?? '' },
  { id: 'discord', label: 'Discord', url: process.env.NEXT_PUBLIC_SOCIAL_DISCORD ?? '' },
  { id: 'linkedin', label: 'LinkedIn', url: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? '' },
].filter((s) => s.url);

/** X handle (e.g. "@uapmatrix") derived from the X profile URL, for Twitter cards. */
export const X_HANDLE = (() => {
  const m = SOCIALS.find((s) => s.id === 'x')?.url.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)/);
  return m ? `@${m[1]}` : undefined;
})();
