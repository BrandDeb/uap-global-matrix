import type { Metadata } from 'next';
import Keeper from '@/components/keeper/Keeper';

export const metadata: Metadata = {
  title: 'Xeno Keeper: rescue and raise aliens',
  description: 'Rescue alien survivors from a new crash site every day, add them to your card collection, and raise a family of aliens by answering space-science questions.',
  alternates: { canonical: '/keeper' },
};

export default function KeeperPage() {
  return <Keeper />;
}
