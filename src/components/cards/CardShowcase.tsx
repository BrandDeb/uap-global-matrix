'use client';

/**
 * Full-screen card page (gacha "character details" style): hero artwork with
 * an animated aura for Legendary+, rarity / element / stars / level overlay,
 * and tabs for Status (power level + stats), Abilities and Info.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap } from 'lucide-react';
import AlienAvatar from '@/components/profile/AlienAvatar';
import { xenoAudio } from '@/components/landing/audio';
import { abilitiesOf, COLORS, dropChance, levelCap, powerOf, RARITY, shardsToNext, starsFor, statsOf, WHEEL, type CardDef, type Owned } from '@/lib/cards';
import { ILLUSTRATED } from '@/lib/cardArt';
import { cardAction, useCollection } from '@/lib/collection';

export default function CardShowcase({ def, o, onClose }: { def: CardDef; o?: Owned; onClose: () => void }) {
  const c = useCollection();
  const [tab, setTab] = useState<'status' | 'abilities' | 'info'>('status');
  const own = o ?? { shards: 0, level: 1 };
  const stars = o ? starsFor(o.shards) : 1;
  const st = statsOf(def, own);
  const base = statsOf(def, { shards: 0, level: 1 });
  const col = COLORS[def.color];
  const rar = RARITY[def.rarity];
  const ab = abilitiesOf(def);
  const epic = def.rarity === 'L' || def.rarity === 'U' || def.rarity === 'M';
  const next = o ? shardsToNext(o.shards) : null;
  const strong = WHEEL[(WHEEL.indexOf(def.color) + 1) % 5];
  const weak = WHEEL[(WHEEL.indexOf(def.color) + 4) % 5];
  const fmt = (n: number) => (n < 0.1 ? n.toFixed(2) : n.toFixed(1));

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${def.name} details`} className="fixed inset-0 z-[80] overflow-y-auto bg-[#04030a]" data-lenis-prevent>
      <div className="mx-auto grid min-h-full max-w-6xl md:grid-cols-[1.1fr_1fr]">
        {/* ARTWORK */}
        <div className="relative flex min-h-[58svh] items-center justify-center overflow-hidden md:min-h-[100svh]" style={{ background: `radial-gradient(circle at 50% 45%, ${col.glow}66, ${def.art.bg} 55%, #04030a 90%)` }}>
          {epic && (
            <>
              <div aria-hidden className="aura-spin absolute aspect-square w-[140%] max-w-[900px] rounded-full opacity-45 blur-2xl" style={{ background: def.rarity === 'L' ? `conic-gradient(from 0deg, transparent, ${col.hex}, transparent 30%, ${col.glow}, transparent 60%, ${col.hex}, transparent)` : 'conic-gradient(from 0deg, #ff5c5c55, #ffd23f55, #5cff8f55, #4cb8ff55, #a56bff55, #ff5c5c55)' }} />
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} aria-hidden className="aura-mote absolute bottom-[12%] h-2 w-2 rounded-full" style={{ left: `${8 + ((i * 53) % 84)}%`, background: i % 2 ? col.glow : '#ffffff', animationDelay: `${(i * 0.37) % 3.6}s`, boxShadow: `0 0 12px ${col.hex}` }} />
              ))}
            </>
          )}
          <div className={`relative ${epic ? 'aura-bob' : ''}`}>
            {ILLUSTRATED.has(def.id) ? (
              // eslint-disable-next-line @next/next/no-img-element -- local artwork
              <img src={`/cards/${def.id}.webp`} alt={def.name} className="max-h-[70svh] w-auto drop-shadow-[0_20px_60px_rgba(0,0,0,0.7)]" />
            ) : (
              <AlienAvatar index={0} spec={{ ...def.art, bg: 'transparent' }} size={300} className="drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)]" />
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur md:left-4 md:right-auto">
            <X size={18} />
          </button>
          <span className="absolute right-4 top-5 hidden font-mono text-xs text-white/60 md:block">#{String(def.no ?? 0).padStart(3, '0')}</span>
          {/* identity strip */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-5 pb-5 pt-16">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className={`font-[family-name:var(--font-display)] text-xl font-extrabold uppercase italic tracking-wide ${rar.frame === 'holo' ? 'xeno-gradient-text' : ''}`} style={rar.frame === 'holo' ? undefined : { color: rar.frame }}>
                  {rar.name}
                </p>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase leading-[1] md:text-4xl">{def.name}</h2>
              </div>
              <span className="shrink-0 rounded-full px-3 py-1 font-mono text-xs font-bold text-black" style={{ background: col.hex }}>
                {col.icon} {col.name}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-lg tracking-tight" aria-label={`${stars} stars`}>
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} style={{ color: i < Math.min(7, stars) ? (stars > 7 && i < stars - 7 ? '#ff5ec8' : '#ffd23f') : '#ffffff26', textShadow: i < stars ? '0 0 8px currentColor' : undefined }}>★</span>
                ))}
              </span>
              {stars > 7 && <span className="font-mono text-xs text-[#ff5ec8]">Zenith +{stars - 7}</span>}
              <span className="ml-auto font-mono text-xs text-white/70">
                Lv {own.level}/{levelCap(stars)}
              </span>
            </div>
          </div>
        </div>

        {/* PANEL */}
        <div className="bg-[#0b0918] p-5 md:p-8">
          <div className="flex gap-2">
            {(['status', 'abilities', 'info'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-xl py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] ${tab === t ? 'bg-[var(--xeno-a)] font-bold text-black' : 'border border-white/12 text-white/60'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'status' && (
            <div className="mt-6">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Power level</span>
                <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--xeno-a)]">{powerOf(def, own).toLocaleString()}</span>
              </div>
              <table className="mt-4 w-full table-fixed font-mono text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                    <th className="pb-2 text-left font-normal">Stat</th>
                    <th className="pb-2 text-right font-normal">Total</th>
                    <th className="pb-2 text-right font-normal">Boost</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['Health', st.hp, base.hp],
                      ['Attack', st.atk, base.atk],
                      ['Defense', st.def, base.def],
                      ['Speed', st.spd, base.spd],
                    ] as const
                  ).map(([k, v, b]) => (
                    <tr key={k} className="border-t border-white/5">
                      <td className="py-2 text-left text-white/75">{k}</td>
                      <td className="py-2 text-right text-white">{v.toLocaleString()}</td>
                      <td className="py-2 text-right text-[var(--xeno-c)]">{v - b > 0 ? `(+${(v - b).toLocaleString()})` : '(0)'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {o ? (
                <>
                  <p className="mt-4 text-xs text-white/50">{next === null ? 'Maximum stars reached.' : `${next} more duplicate${next === 1 ? '' : 's'} to reach ${stars + 1}★ (raises stats and level cap).`}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[1, 10].map((n) => (
                      <button key={n} type="button" disabled={c.wallet.energy < 1 || own.level >= levelCap(stars)} onClick={() => void cardAction('train', { id: def.id, levels: n }).then(() => (n === 1 ? xenoAudio?.blip(0.8) : xenoAudio?.chime()))} className="xeno-btn disabled:opacity-40">
                        <Zap size={12} /> Train +{n}
                      </button>
                    ))}
                    <span className="self-center font-mono text-xs text-white/45">⚡ {c.wallet.energy} energy</span>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-white/45">Not discovered yet. Showing base stats. Summon it or rescue it in Xeno Keeper.</p>
              )}
            </div>
          )}

          {tab === 'abilities' && (
            <div className="mt-6 space-y-4">
              {[
                ['Leader ability', ab.leader.name, ab.leader.text, '#ffd23f'],
                ['Passive', ab.passive.name, ab.passive.text, '#5effd8'],
                ['Signature move', ab.skill.name, ab.skill.text, col.hex],
              ].map(([kind, name, text, color]) => (
                <div key={kind} className="overflow-hidden rounded-2xl border border-white/10">
                  <p className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-black" style={{ background: color }}>
                    {kind}
                  </p>
                  <div className="bg-black/40 px-4 py-3">
                    <p className="font-semibold">{name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">{text}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-white/45">
                Strong against {COLORS[strong].icon} {COLORS[strong].name} (×1.5 damage) · weak to {COLORS[weak].icon} {COLORS[weak].name}.
              </p>
            </div>
          )}

          {tab === 'info' && (
            <div className="mt-6 space-y-4 text-sm">
              <p className="italic leading-relaxed text-white/70">“{def.lore}”</p>
              <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
                {[
                  ['Collector no.', `#${String(def.no ?? 0).padStart(3, '0')} of 156`],
                  ['Drop chance', `${fmt(dropChance(def))}% per summon`],
                  ['Rarity', rar.name],
                  ['Element', `${col.icon} ${col.name}`],
                  ['Copies owned', o ? String(o.shards + 1) : '0'],
                  ['Stars', `${stars}★`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <dt className="text-white/40">{k}</dt>
                    <dd className="mt-1 text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
