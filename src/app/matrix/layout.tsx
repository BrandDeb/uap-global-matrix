import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live 3D UFO sighting globe',
  description: 'Explore every UFO and UAP sighting on an interactive 3D globe: filter by year, craft shape and credibility, open case dossiers, and report your own sighting.',
  alternates: { canonical: '/matrix' },
  openGraph: { url: '/matrix' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
