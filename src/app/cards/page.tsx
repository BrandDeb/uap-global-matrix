import type { Metadata } from 'next';
import CardsApp from '@/components/cards/CardsApp';

export const metadata: Metadata = {
  title: 'Xeno Cards: collect, train and battle alien cards',
  description: 'A free alien trading card game: summon visitors across five rarities, stack duplicates into 14-star cards, train them and battle other pilots with a five-colour type wheel.',
  alternates: { canonical: '/cards' },
};

export default function CardsPage() {
  return <CardsApp />;
}
