import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

export const metadata: Metadata = {
  title: 'UAP/MATRIX — We come in peace (mostly)',
  description:
    'A live, planet-scale atlas of unidentified anomalous phenomena: every sighting since 1947, geotagged, forensically scored and argued about in public.',
};

export default function Home() {
  return <Landing />;
}
