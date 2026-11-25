import type { Metadata } from 'next';
import DailyChallenge from '@/components/daily/DailyChallenge';

export const metadata: Metadata = {
  title: 'Daily UFO Challenge: plane, satellite, balloon or unexplained?',
  description: 'One real UFO sighting a day. Read the report, guess what it really was, and keep your streak alive. A new case every midnight UTC.',
  alternates: { canonical: '/daily' },
  openGraph: { url: '/daily' },
};

export default function DailyPage() {
  return <DailyChallenge />;
}
