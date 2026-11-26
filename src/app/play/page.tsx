import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Play: cards, Xeno Keeper, daily challenge and arcade',
  description: 'Everything playable on UAP/MATRIX: collect and battle Xeno Cards, raise aliens in Xeno Keeper, crack the Daily Challenge and play four arcade games.',
  alternates: { canonical: '/play' },
};

const ITEMS = [
  { href: '/cards', title: 'Xeno Cards', note: 'Summon, star up, train, battle pilots', emoji: '🃏', color: '#a56bff' },
  { href: '/keeper', title: 'Xeno Keeper', note: 'Rescue survivors, raise your alien family', emoji: '🛸', color: '#5effd8' },
  { href: '/daily', title: 'Daily Challenge', note: 'One real case a day. Keep the streak', emoji: '📅', color: '#ffd23f' },
  { href: '/arcade', title: 'Arcade', note: 'Four games, weekly prizes', emoji: '🕹', color: '#ff5ec8' },
  { href: '/hangar', title: 'Hangar', note: 'Build your craft, fly Star Forge', emoji: '🛠', color: '#38e8ff' },
  { href: '/crop-circles', title: 'Crop Circles', note: 'Draw, publish, collect likes', emoji: '🌾', color: '#c6ff6b' },
  { href: '/pilots', title: 'Pilots', note: 'Ranks and profiles', emoji: '🏆', color: '#4cb8ff' },
];

export default function Play() {
  return (
    <main className="mx-auto min-h-[100svh] max-w-4xl px-4 pb-28 pt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">Play</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1]">
        Pick your <span className="xeno-gradient-text">mission</span>
      </h1>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/30">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `${i.color}22`, boxShadow: `inset 0 0 0 1px ${i.color}55` }}>
                {i.emoji}
              </span>
              <span>
                <span className="block font-[family-name:var(--font-display)] text-lg font-extrabold uppercase">{i.title}</span>
                <span className="block text-sm text-white/55">{i.note}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
