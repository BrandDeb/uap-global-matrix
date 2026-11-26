'use client';

/**
 * /hangar: assemble your craft from collectible parts (frame, thrusters,
 * wings, weapon), preview it on a rotating pad, then fly it in Star Forge.
 * Parts drop while playing; scrap buys ones you haven't found yet.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Rocket, Lock } from 'lucide-react';
import { toast } from 'sonner';
import GameCanvas, { type GameMeta } from '@/components/arcade/GameCanvas';
import { StarForge } from '@/components/arcade/StarForge';
import { craftLevel, drawShip, loadoutStats, PART_BY_ID, partsOfSlot, RARITY, SHIP_COLORS, type Slot } from '@/lib/craft';
import { BUY_PRICE, buyPart, equip, setColor, useHangar } from '@/lib/hangarStore';
import { xenoAudio } from '@/components/landing/audio';

const META: GameMeta = {
  title: 'Star Forge',
  tagline: 'Fly the craft you built. Survive escalating waves, beat a boss every 5th wave, grab scrap and discover new parts, then upgrade in the Hangar.',
  controls: ['Arrows / WASD  fly', 'Auto-fire', 'Touch  drag to steer'],
};
const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'frame', label: 'Frame' },
  { slot: 'thrusters', label: 'Thrusters' },
  { slot: 'wings', label: 'Wings' },
  { slot: 'weapon', label: 'Weapon' },
];

export default function Hangar() {
  const h = useHangar();
  const [playing, setPlaying] = useState(false);
  const [slot, setSlot] = useState<Slot>('frame');
  const lvl = craftLevel(h.scrapEarned);
  const stats = loadoutStats(h.craft);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (playing) return;
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    let raf = 0;
    const loop = (ms: number) => {
      const t = ms / 1000;
      ctx.clearRect(0, 0, c.width, c.height);
      // pad
      const cx = c.width / 2;
      const cy = c.height / 2 + 30;
      ctx.strokeStyle = 'rgba(94,255,216,0.18)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + 70, i * 26, i * 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const bob = Math.sin(t * 1.4) * 6;
      drawShip(ctx, cx, cy + bob, 52, h.craft, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [h.craft, playing]);

  if (playing) {
    return (
      <main className="mx-auto min-h-[100svh] w-full min-w-0 max-w-5xl px-4 pb-24 pt-5 md:px-6">
        <button type="button" onClick={() => setPlaying(false)} className="xeno-btn mb-4">
          <ArrowLeft size={12} /> Back to Hangar
        </button>
        <GameCanvas key={JSON.stringify(h.craft)} create={() => new StarForge(h.craft)} meta={META} gameId="star-forge" />
      </main>
    );
  }

  const list = partsOfSlot(slot);
  const found = h.owned.length;
  return (
    <main className="mx-auto min-h-[100svh] w-full min-w-0 max-w-6xl px-4 pb-24 pt-5 md:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="xeno-btn">
          <ArrowLeft size={12} /> Home
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-full border border-white/15 px-3 py-1.5">🔧 {h.scrap}</span>
          <span className="rounded-full border border-white/15 px-3 py-1.5">Rank {lvl}</span>
        </div>
      </header>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-6xl">
        The <span className="xeno-gradient-text">Hangar</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-white/55">Build your craft from parts. Fly it in Star Forge to earn scrap and discover new frames, thrusters, wings and weapons. Collected {found}/{PART_BY_ID && Object.keys(PART_BY_ID).length} parts.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div>
          <div className="xeno-glass overflow-hidden p-4" style={{ background: `radial-gradient(circle at 50% 40%, ${h.craft.color}22, #07060f 70%)` }}>
            <canvas ref={canvas} width={340} height={300} className="mx-auto w-full max-w-[340px]" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Livery</span>
            {SHIP_COLORS.map((col) => (
              <button key={col} type="button" aria-label={`Colour ${col}`} onClick={() => setColor(col)} className={`h-6 w-6 rounded-full transition ${h.craft.color === col ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-70 hover:opacity-100'}`} style={{ background: col, boxShadow: `0 0 10px ${col}` }} />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
            {[
              ['Hull', `${stats.hp} hp`],
              ['Speed', Math.round(stats.speed)],
              ['Fire', `${stats.fireRate.toFixed(1)}/s`],
              ['Damage', stats.damage.toFixed(1)],
              ['Wing guns', stats.wingGuns],
              ['Power', stats.power],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-black/30 p-2 text-center">
                <dt className="text-white/40">{k}</dt>
                <dd className="mt-0.5 text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <button type="button" onClick={() => { setPlaying(true); xenoAudio?.whoosh(); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--xeno-a)] py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <Rocket size={14} /> Launch Star Forge
          </button>
          {h.bestWave > 0 && <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Best wave {h.bestWave}</p>}
        </div>

        <div>
          <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {SLOTS.map((s) => (
              <button key={s.slot} type="button" onClick={() => setSlot(s.slot)} aria-pressed={slot === s.slot} className={`shrink-0 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] ${slot === s.slot ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/15 text-white' : 'border-white/15 text-white/55'}`}>
                {s.label}
              </button>
            ))}
          </nav>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {list.map((p) => {
              const owned = h.owned.includes(p.id);
              const equipped = h.craft[slot] === p.id;
              const rc = RARITY[p.rarity];
              return (
                <li key={p.id} className={`rounded-2xl border p-3 ${equipped ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/10' : 'border-white/10'} ${!owned ? 'opacity-80' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{p.name}</p>
                    <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-black" style={{ background: rc.color }}>
                      {rc.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">{p.blurb}</p>
                  <div className="mt-2">
                    {equipped ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--xeno-a)]">Equipped</span>
                    ) : owned ? (
                      <button type="button" onClick={() => { equip(slot, p.id); xenoAudio?.blip(0.7); }} className="xeno-btn !py-1.5">Equip</button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={h.scrap < BUY_PRICE[p.rarity]} onClick={() => { if (buyPart(p.id)) { equip(slot, p.id); xenoAudio?.chime(); toast(`${p.name} acquired.`); } }} className="rounded-full bg-[#ffd23f] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black disabled:opacity-40">
                          🔧 {BUY_PRICE[p.rarity]}
                        </button>
                        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-white/35">
                          <Lock size={10} /> or find it flying
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-white/40">Every run banks the scrap you collect, even if you crash. Rarer parts drop less often, bosses always drop one.</p>
        </div>
      </div>
    </main>
  );
}
