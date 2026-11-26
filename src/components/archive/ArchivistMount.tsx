'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const Archivist = dynamic(() => import('./Archivist'), { ssr: false });

/** The AI guide on every page except full-screen game/globe views. */
export default function ArchivistMount() {
  const path = usePathname();
  if (path === '/matrix' || path.startsWith('/arcade') || path === '/comms' || path === '/cards') return null;
  return <Archivist />;
}
