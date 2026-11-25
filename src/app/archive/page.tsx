import type { Metadata } from 'next';
import ArchiveFiles from '@/components/archive/ArchiveFiles';

export const metadata: Metadata = {
  title: 'The Files · UAP/MATRIX',
  description: '59 landmark UFO/UAP cases from 1942 to 2026 — foo fighters to the sensor age — with sources, document ids and craft shapes.',
};

export default function ArchivePage() {
  return <ArchiveFiles />;
}
