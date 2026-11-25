import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';
import JsonLd from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'UAP/MATRIX — We come in peace (mostly)',
  alternates: { canonical: '/' },
  description:
    'A live, planet-scale atlas of unidentified anomalous phenomena: every sighting since 1947, geotagged, forensically scored and argued about in public.',
};

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              name: 'UAP/MATRIX',
              url: SITE_URL,
              description: metadata.description,
            },
            { '@type': 'Organization', name: 'UAP/MATRIX', url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
          ],
        }}
      />
      <Landing />
    </>
  );
}
