import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Latest UFO sighting reports',
  description: 'The global feed of the newest UFO and UAP sighting reports, with credibility scores, co-witnesses and discussion.',
  alternates: { canonical: '/feed' },
  openGraph: { url: '/feed' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
