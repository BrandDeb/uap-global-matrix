import type { Metadata } from 'next';
import Arcade from '@/components/arcade/Arcade';

export const metadata: Metadata = {
  title: 'The Arcade · UAP/MATRIX',
  description: 'Three original UFO arcade games: Moo-ve It, Junk Invaders and Gravity Janitor.',
};

export default function ArcadePage() {
  return <Arcade />;
}
