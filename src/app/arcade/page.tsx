import type { Metadata } from 'next';
import Arcade from '@/components/arcade/Arcade';
import JsonLd from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Free UFO games: Moo-ve It, Junk Invaders, Gravity Janitor',
  description:
    'Play free browser UFO arcade games. Beam up cows across five nights in Moo-ve It, recycle space junk in Junk Invaders, and fling debris into a black hole in Gravity Janitor. Weekly leaderboards with prizes for the top 3.',
  alternates: { canonical: '/arcade' },
  openGraph: { url: '/arcade' },
};

const GAMES = [
  ['Moo-ve It', 'moove-it', 'Beam cows into your saucer across five nights with quotas, storms, searchlights and power-ups.'],
  ['Junk Invaders', 'junk-invaders', 'Defend your moon from descending space junk and recycle it for a super shot.'],
  ['Gravity Janitor', 'gravity-janitor', 'Clean orbital debris around a black hole whose gravity bends your ship and your shots.'],
];

export default function ArcadePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': GAMES.map(([name, id, description]) => ({
            '@type': 'VideoGame',
            name,
            description,
            url: `${SITE_URL}/arcade?game=${id}`,
            genre: 'Arcade',
            gamePlatform: 'Web browser',
            applicationCategory: 'Game',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
            author: { '@type': 'Organization', name: 'Lowkee Studios' },
          })),
        }}
      />
      <Arcade />
    </>
  );
}
