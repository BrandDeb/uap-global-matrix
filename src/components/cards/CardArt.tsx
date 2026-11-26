'use client';

/**
 * src/components/cards/CardArt.tsx
 * ---------------------------------------------------------------------------
 * Premium presentation layer for a card's creature. Renders the vector alien
 * (or a commissioned illustration when one exists in /public/cards) and adds
 * depth that flat art lacks: a cast ground shadow, a soft top highlight
 * (screen blend) and bottom core shadow (multiply) to sculpt volume, a rim
 * glow in the element colour, and an animated foil sheen for rare+ cards.
 * One component lifts the look of all 156 cards at once; swap in real art per
 * card via cardArt.ts with no other change.
 * ---------------------------------------------------------------------------
 */
import AlienAvatar from '@/components/profile/AlienAvatar';
import { ILLUSTRATED } from '@/lib/cardArt';
import type { CardDef } from '@/lib/cards';

export default function CardArt({ def, size, glow, foil = false }: { def: CardDef; size: number; glow: string; foil?: boolean }) {
  const illustrated = ILLUSTRATED.has(def.id);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} data-keep-colors>
      {/* ambient element glow */}
      <span aria-hidden className="absolute rounded-full blur-2xl" style={{ width: size * 0.7, height: size * 0.7, background: glow, opacity: 0.35 }} />
      {/* ground shadow */}
      <span aria-hidden className="absolute rounded-[50%] blur-md" style={{ width: size * 0.56, height: size * 0.12, background: '#000', opacity: 0.5, bottom: size * 0.08 }} />
      {illustrated ? (
        // eslint-disable-next-line @next/next/no-img-element -- local artwork
        <img src={`/cards/${def.id}.webp`} alt={def.name} className="relative h-full w-full object-contain" draggable={false} style={{ filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.55))' }} />
      ) : (
        <div className="relative transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.04]" style={{ filter: `drop-shadow(0 ${size * 0.05}px ${size * 0.08}px rgba(0,0,0,0.6)) saturate(1.12) contrast(1.06)` }}>
          <AlienAvatar index={0} spec={{ ...def.art, bg: 'transparent' }} size={size * 0.74} />
          {/* top-left volume highlight */}
          <span aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: `radial-gradient(60% 55% at 38% 30%, rgba(255,255,255,0.5), transparent 70%)` }} />
          {/* bottom core shadow */}
          <span aria-hidden className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ background: `radial-gradient(70% 55% at 55% 85%, rgba(0,0,0,0.55), transparent 70%)` }} />
          {/* rim light in element colour */}
          <span aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: `radial-gradient(75% 70% at 72% 28%, ${glow}, transparent 55%)`, opacity: 0.5 }} />
        </div>
      )}
      {/* foil sheen (rare+) */}
      {foil && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-color-dodge"
          style={{
            background: 'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0.08) 54%, transparent 62%)',
            backgroundSize: '220% 220%',
            animation: 'xeno-sheen 4.5s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}
