'use client';

/**
 * A premium trading-card frame: colour-type border, rarity foil, stars,
 * stat block and a holographic sheen that follows the pointer (tilt).
 * Uses the commissioned illustration when one exists, otherwise the vector
 * alien placeholder.
 */
import { useRef } from 'react';
import AlienAvatar from '@/components/profile/AlienAvatar';
import { COLORS, RARITY, statsOf, type CardDef, type Owned } from '@/lib/cards';
import { ILLUSTRATED } from '@/lib/cardArt';

export default function XenoCard({ def, owned, size = 220, onClick, dim = false }: { def: CardDef; owned?: Owned; size?: number; onClick?: () => void; dim?: boolean }) {
  const el = useRef<HTMLButtonElement>(null);
  const o = owned ?? { shards: 0, level: 1 };
  const s = statsOf(def, o);
  const col = COLORS[def.color];
  const rar = RARITY[def.rarity];
  const holo = def.rarity === 'U' || def.rarity === 'L';
  const frame =
    rar.frame === 'holo'
      ? 'conic-gradient(from var(--ang,0deg), #ff5c5c, #ffd23f, #5cff8f, #4cb8ff, #a56bff, #ff5c5c)'
      : `linear-gradient(135deg, ${rar.frame}, ${col.hex} 45%, ${rar.frame})`;

  const move = (e: React.PointerEvent) => {
    const r = el.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.current!.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
    el.current!.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
    el.current!.style.setProperty('--mx', `${x * 100}%`);
    el.current!.style.setProperty('--my', `${y * 100}%`);
    el.current!.style.setProperty('--ang', `${x * 360}deg`);
  };
  const leave = () => {
    el.current!.style.setProperty('--rx', '0deg');
    el.current!.style.setProperty('--ry', '0deg');
  };

  const h = size * 1.4;
  return (
    <button
      ref={el}
      type="button"
      onClick={onClick}
      onPointerMove={move}
      onPointerLeave={leave}
      aria-label={`${def.name}, ${rar.name} ${col.name} card, ${s.stars} stars`}
      className={`group relative shrink-0 rounded-[18px] p-[3px] text-left transition-[transform,filter] duration-200 [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] ${dim ? 'opacity-40 grayscale' : ''}`}
      style={{ width: size, height: h, background: frame, boxShadow: `0 10px 40px -10px ${col.hex}99` }}
      data-keep-colors
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[15px]" style={{ background: `radial-gradient(circle at 50% 30%, ${col.hex}33, #07060f 70%)` }}>
        {/* header */}
        <div className="flex items-center justify-between gap-1 px-2.5 pt-2" style={{ fontSize: size * 0.058 }}>
          <span className="min-w-0 truncate font-[family-name:var(--font-display)] font-extrabold uppercase leading-none text-white">{def.name}</span>
          <span className="grid shrink-0 place-items-center rounded-full font-bold" style={{ background: col.hex, width: size * 0.11, height: size * 0.11, fontSize: size * 0.06 }} title={col.name}>
            {col.icon}
          </span>
        </div>
        {/* art */}
        <div className="relative mx-2.5 mt-1.5 flex flex-1 items-center justify-center overflow-hidden rounded-[10px] border border-white/10" style={{ background: `radial-gradient(circle at 50% 60%, ${col.glow}55, ${def.art.bg} 75%)` }}>
          {ILLUSTRATED.has(def.id) ? (
            // eslint-disable-next-line @next/next/no-img-element -- local static artwork
            <img src={`/cards/${def.id}.webp`} alt={def.name} className="h-full w-full object-cover" draggable={false} />
          ) : (
            <AlienAvatar index={0} spec={{ ...def.art, bg: 'transparent' }} size={size * 0.72} className="drop-shadow-[0_8px_18px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105" />
          )}
          <span className="absolute bottom-1 left-1.5 font-mono text-white/70" style={{ fontSize: size * 0.045 }}>
            Lv {o.level}
          </span>
        </div>
        {/* stars */}
        <div className="flex justify-center gap-[2px] pt-1" style={{ fontSize: size * 0.055 }} aria-hidden>
          {Array.from({ length: Math.min(7, s.stars) }, (_, i) => (
            <span key={i} style={{ color: s.stars > 7 ? '#ff5ec8' : '#ffd23f', textShadow: '0 0 6px currentColor' }}>
              ★
            </span>
          ))}
          {s.stars > 7 && <span className="font-mono text-[#ff5ec8]">+{s.stars - 7}</span>}
        </div>
        {/* stats */}
        <div className="grid grid-cols-4 gap-1 px-2.5 pb-1 pt-1 text-center font-mono" style={{ fontSize: size * 0.045 }}>
          {[
            ['HP', s.hp],
            ['ATK', s.atk],
            ['DEF', s.def],
            ['SPD', s.spd],
          ].map(([k, v]) => (
            <span key={k} className="rounded bg-white/5 py-0.5 text-white/85">
              <span className="block text-white/40">{k}</span>
              {v}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between px-2.5 pb-2 font-mono uppercase tracking-wider" style={{ fontSize: size * 0.04 }}>
          <span className="text-white/45">{col.skill}</span>
          <span style={{ color: rar.frame === 'holo' ? '#ffffff' : rar.frame }}>{rar.name}</span>
        </div>
        {/* holo sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-color-dodge transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: holo
              ? 'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.55), transparent 40%), repeating-linear-gradient(115deg, rgba(255,92,92,0.18) 0 6%, rgba(255,210,63,0.18) 6% 12%, rgba(92,255,143,0.18) 12% 18%, rgba(76,184,255,0.18) 18% 24%, rgba(165,107,255,0.18) 24% 30%)'
              : 'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.35), transparent 45%)',
          }}
        />
      </div>
    </button>
  );
}
