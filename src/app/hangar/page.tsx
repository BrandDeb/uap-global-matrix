import type { Metadata } from 'next';
import Hangar from '@/components/hangar/Hangar';

export const metadata: Metadata = {
  title: 'The Hangar: build your craft and fly Star Forge',
  description: 'Build your own UFO from hull, wings, engine and weapon parts, then fly it in Star Forge, an endless wave shooter. Earn scrap, level up and unlock better gear.',
  alternates: { canonical: '/hangar' },
};

export default function HangarPage() {
  return <Hangar />;
}
