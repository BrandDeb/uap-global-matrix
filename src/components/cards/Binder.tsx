'use client';

/** Card binder: 6 series of 26 slots; missing cards show as numbered silhouettes. */
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import AlienAvatar from '@/components/profile/AlienAvatar';
import { xenoAudio } from '@/components/landing/audio';
import { COLORS, powerOf, RARITY, SERIES, SERIES_REWARD, starsFor, type CardDef } from '@/lib/cards';
import { cardAction, useCollection } from '@/lib/collection';

export default function Binder({ onOpen }: { onOpen: (d: CardDef) => void }) {
  const c = useCollection();
  const [i, setI] = useState(0);
  const s = SERIES[i];
  const have = s.cards.filter((d) => c.owned[d.id]).length;
  const claimed = (c.wallet.series_claimed ?? []).includes(s.n);
  const claim = async () => {
    const r = await cardAction<{ granted?: number }>('series', { n: s.n });
    if (r.granted) {
      xenoAudio?.chime();
      toast(`📘 Series ${s.n} complete!`, { description: `+${r.granted} summon signals.` });
    } else toast(r.error ?? 'Not yet.');
  };
  return (
    <section>
      {/* series switcher */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[var(--xeno-b)]/25 to-[var(--xeno-a)]/15 p-3">
        <button type="button" onClick={() => setI((i + SERIES.length - 1) % SERIES.length)} aria-label="Previous series" className="grid h-9 w-9 place-items-center rounded-full bg-black/40">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/55">Series {s.n}</p>
          <p className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase">{s.name}</p>
        </div>
        <button type="button" onClick={() => setI((i + 1) % SERIES.length)} aria-label="Next series" className="grid h-9 w-9 place-items-center rounded-full bg-black/40">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--xeno-b),var(--xeno-a))]" style={{ width: `${(have / 26) * 100}%` }} />
        </div>
        <span className="font-mono text-xs text-white/70">{have}/26</span>
        {claimed ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--xeno-a)]">Reward claimed ✓</span>
        ) : (
          <button type="button" onClick={() => void claim()} disabled={have < 26} className="rounded-full bg-[#ffb020] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black disabled:opacity-40">
            {have < 26 ? `${26 - have} to go · 📡${SERIES_REWARD}` : `Claim 📡${SERIES_REWARD}`}
          </button>
        )}
      </div>
      {/* slots */}
      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {s.cards.map((d) => {
          const o = c.owned[d.id];
          const col = COLORS[d.color];
          if (!o)
            return (
              <button key={d.id} type="button" onClick={() => onOpen(d)} className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] font-[family-name:var(--font-display)] text-lg font-extrabold text-white/25">
                No.{d.no}
              </button>
            );
          return (
            <button key={d.id} type="button" onClick={() => onOpen(d)} className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border-2 text-left" style={{ borderColor: RARITY[d.rarity].frame === 'holo' ? '#ffffff' : RARITY[d.rarity].frame, background: `radial-gradient(circle at 50% 40%, ${col.glow}55, ${d.art.bg} 70%)` }}>
              <span className="absolute right-1 top-1 rounded bg-black/60 px-1 font-mono text-[9px] text-white/80">{o.shards + 1}</span>
              <span className="absolute left-1 top-1 font-mono text-[9px] text-white/60">#{d.no}</span>
              <span className="flex flex-1 items-center justify-center">
                <AlienAvatar index={0} spec={{ ...d.art, bg: 'transparent' }} size={64} />
              </span>
              <span className="truncate px-1.5 text-[10px] font-semibold">{d.name}</span>
              <span className="flex items-center justify-between bg-black/60 px-1.5 py-0.5 font-mono text-[10px]">
                <span>{col.icon}</span>
                <span className="text-[#ffd23f]">{starsFor(o.shards)}★</span>
                <span className="text-white/85">{powerOf(d, o).toLocaleString()}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
