'use client';

/**
 * src/components/arcade/Arcade.tsx
 * ---------------------------------------------------------------------------
 * The /arcade experience: a cabinet-select screen with three original games,
 * deep-linkable via ?game=<id>, plus a soundtrack toggle (the games' SFX ride
 * the same Web Audio engine as the landing page).
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { xenoAudio } from '@/components/landing/audio';
import GameCanvas, { type GameMeta } from './GameCanvas';
import { GravityJanitor } from './GravityJanitor';
import { JunkInvaders } from './JunkInvaders';
import { MooveIt } from './MooveIt';
import { loadBest, type Game } from './engine';
import HallOfFame from './HallOfFame';
import ShareBar from '@/components/ShareBar';

/** ?friend=Name: that friend appears in Moo-ve It as a VIP cow to beam up. */
function friendFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const f = new URLSearchParams(window.location.search).get('friend');
  return f ? f.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 16) || null : null;
}

function AbductFriend() {
  const [name, setName] = useState('');
  const share = async () => {
    const n = name.trim().slice(0, 16);
    if (!n) return;
    const url = `${window.location.origin}/arcade?game=moove-it&friend=${encodeURIComponent(n)}`;
    const text = `I hid ${n} in a field full of cows. Beam them up 🛸🐄`;
    try {
      if (navigator.share) await navigator.share({ url, text });
      else {
        await navigator.clipboard.writeText(url);
        toast('Abduction link copied', { description: 'Send it to them. Or to everyone.' });
      }
    } catch {
      /* cancelled */
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void share();
      }}
      className="mx-auto mt-4 flex max-w-[1100px] flex-wrap items-center justify-center gap-2"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">🐄 Abduct a friend</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={16}
        placeholder="Friend's name"
        aria-label="Friend's name"
        className="w-40 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 font-mono text-xs text-white placeholder:text-white/30 focus:border-[var(--xeno-d)]/60 focus:outline-none"
      />
      <button type="submit" disabled={!name.trim()} className="rounded-full bg-[var(--xeno-d)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black disabled:opacity-40">
        Send link
      </button>
    </form>
  );
}

interface Entry {
  id: string;
  create: () => Game;
  meta: GameMeta;
  color: string;
  emoji: string;
  blurb: string;
}

const GAMES: ReadonlyArray<Entry> = [
  {
    id: 'moove-it',
    create: () => new MooveIt(friendFromUrl()),
    color: '#5effd8',
    emoji: '🐄',
    blurb: 'Five nights. One beam. Too many cows. Storms, searchlights and very angry farmers.',
    meta: {
      title: 'Moo-ve It',
      tagline:
        'Five nights, five quotas. Beam cows before dawn: bulls are heavy, calves are quick, the golden cow is worth 10× and will not cooperate. Dodge farmers’ camera flashes, ride out a thunderstorm, slip past military searchlights, and beam up crates for Coolant or Mega Beam.',
      controls: ['← → / A D  move', 'Space  hold beam', 'Mouse/touch  steer + hold'],
    },
  },
  {
    id: 'junk-invaders',
    create: () => new JunkInvaders(),
    color: '#ff5ec8',
    emoji: '🛰️',
    blurb: 'Humanity’s space junk is marching on your moon. Recycle it. Violently.',
    meta: {
      title: 'Junk Invaders',
      tagline:
        'Satellites, selfie-drones and floating space-cars are descending on your moon. Blast them, and catch the junk they drop in your beam to charge a piercing super-shot. Crop-circle shields regrow. Every 3rd wave: the Station.',
      controls: ['← → / A D  move', 'Space / click  fire', 'Shift / X  recycle beam'],
    },
  },
  {
    id: 'gravity-janitor',
    create: () => new GravityJanitor(),
    color: '#ffd36b',
    emoji: '🕳️',
    blurb: 'A black hole bends everything, even your shots. Fling junk in. Don’t feed it.',
    meta: {
      title: 'Gravity Janitor',
      tagline:
        'Clean up orbital debris around a hungry black hole. Gravity curves your ship AND your bolts. Grab small junk with the tractor and fling it into the hole for ×3 “proper disposal”. Let it eat on its own and it grows…',
      controls: ['← → rotate · ↑ thrust', 'Space  fire', 'E / Shift  tractor + fling', 'Mouse  aim · hold to fly'],
    },
  },
];

const HOF_GAMES = GAMES.map((g) => ({ id: g.id, title: g.meta.title, color: g.color }));

export default function Arcade() {
  const [active, setActive] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [bests, setBests] = useState<Record<string, number>>({});

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('game');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read deep link once on mount
    if (id && GAMES.some((g) => g.id === id)) setActive(id);
    setBests(Object.fromEntries(GAMES.map((g) => [g.id, loadBest(g.id)])));
  }, []);

  const pick = useCallback((id: string | null) => {
    setActive(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('game', id);
    else url.searchParams.delete('game');
    window.history.replaceState(null, '', url);
    if (!id) setBests(Object.fromEntries(GAMES.map((g) => [g.id, loadBest(g.id)])));
    xenoAudio?.blip(0.9);
  }, []);

  const toggleSound = async () => {
    if (!xenoAudio) return;
    await xenoAudio.toggle();
    setSoundOn(xenoAudio.playing);
  };

  const game = GAMES.find((g) => g.id === active);

  return (
    <main className="relative min-h-[100svh] overflow-hidden px-4 pb-16 pt-6 md:px-10">
      {/* backdrop grid horizon */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[45vh] opacity-40 [background:linear-gradient(to_top,rgba(94,255,216,0.25),transparent),repeating-linear-gradient(90deg,rgba(94,255,216,0.25)_0_1px,transparent_1px_80px),repeating-linear-gradient(0deg,rgba(94,255,216,0.25)_0_1px,transparent_1px_40px)] [mask-image:linear-gradient(to_top,black,transparent)] [transform:perspective(500px)_rotateX(60deg)] [transform-origin:bottom]"
      />

      <header className="relative z-10 mb-8 flex items-center justify-between">
        {game ? (
          <button type="button" onClick={() => pick(null)} className="xeno-btn">
            <ArrowLeft size={12} /> All games
          </button>
        ) : (
          <Link href="/" className="xeno-btn">
            <ArrowLeft size={12} /> Home
          </Link>
        )}
        <span className="font-[family-name:var(--font-display)] text-sm tracking-[0.3em]">
          UAP<span className="text-[var(--xeno-a)]">/</span>ARCADE
        </span>
        <button type="button" onClick={() => void toggleSound()} className="xeno-btn" aria-pressed={soundOn}>
          {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span className="hidden sm:inline">{soundOn ? 'Sound on' : 'Sound off'}</span>
        </button>
      </header>

      {game ? (
        <section className="relative z-10">
          <GameCanvas key={game.id} create={game.create} meta={game.meta} gameId={game.id} />
          {game.id === 'moove-it' && <AbductFriend />}
          <p className="mx-auto mt-4 max-w-[1100px] text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
            Turn sound on for the full experience · a Lowkee Studios production
          </p>
        </section>
      ) : (
        <section className="relative z-10">
          <div className="mb-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">Three original games · zero quarters</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-[13vw] font-extrabold uppercase leading-[0.96] md:text-[7vw]">
              The <span className="xeno-gradient-text">Arcade</span>
            </h1>
          </div>
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
            {GAMES.map((g, i) => (
              <button
                key={g.id}
                type="button"
                onClick={() => pick(g.id)}
                data-cursor="PLAY"
                className="group relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#07060f] p-6 text-left transition duration-500 hover:-translate-y-2 hover:border-white/30"
                style={{ boxShadow: `0 0 0 0 ${g.color}` }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
                  style={{ background: g.color }}
                />
                <span className="font-mono text-[10px] tracking-[0.4em] text-white/40">CABINET 0{i + 1}</span>
                <span className="text-7xl transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-125">{g.emoji}</span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase" style={{ color: g.color }}>
                    {g.meta.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{g.blurb}</p>
                  <div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em]">
                    <span className="text-white/40">Best {(bests[g.id] ?? 0).toLocaleString()}</span>
                    <span className="rounded-full px-3 py-1 text-black" style={{ background: g.color }}>
                      Play ▸
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <HallOfFame games={HOF_GAMES} />
          <ShareBar className="mx-auto mt-10 max-w-6xl justify-center" url="https://uap-global-matrix.vercel.app/arcade" text="Free UFO arcade games with weekly prizes 🛸🐄" />
        </section>
      )}
    </main>
  );
}
