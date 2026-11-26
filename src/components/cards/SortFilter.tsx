'use client';

/**
 * Collection sort & filter sheet (inspired by gacha collection screens, kept
 * simple): search, rarity + element checkboxes, owned-only, and a sort key
 * with ascending / descending. Choices persist on this device.
 */
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { COLORS, RARITY, WHEEL, type Color, type Rarity } from '@/lib/cards';

export type SortKey = 'rarity' | 'no' | 'power' | 'level' | 'stars' | 'hp' | 'atk' | 'def' | 'spd' | 'name' | 'color';
export interface View {
  q: string;
  rarities: Rarity[];
  colors: Color[];
  owned: boolean;
  sort: SortKey;
  desc: boolean;
}
export const DEFAULT_VIEW: View = { q: '', rarities: [], colors: [], owned: false, sort: 'rarity', desc: true };
const SORTS: [SortKey, string][] = [
  ['rarity', 'Rarity'],
  ['power', 'Power'],
  ['level', 'Level'],
  ['stars', 'Stars'],
  ['color', 'Element'],
  ['no', 'Collector No.'],
  ['hp', 'Health'],
  ['atk', 'Attack'],
  ['def', 'Defense'],
  ['spd', 'Speed'],
  ['name', 'Name'],
];

export default function SortFilter({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(view);
  const [tab, setTab] = useState<'filter' | 'sort'>('filter');
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const active = view.rarities.length + view.colors.length + (view.owned ? 1 : 0) + (view.q ? 1 : 0);
  const box = (on: boolean) => `flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${on ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/10 text-white' : 'border-white/12 text-white/70 hover:border-white/30'}`;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={view.q}
          onChange={(e) => onChange({ ...view, q: e.target.value })}
          placeholder="Search cards…"
          aria-label="Search cards"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--xeno-a)]/60 focus:outline-none sm:max-w-xs"
        />
        <button type="button" onClick={() => { setDraft(view); setOpen(true); }} className="xeno-btn">
          <SlidersHorizontal size={13} /> Sort & filter{active ? ` · ${active}` : ''}
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          {SORTS.find((s) => s[0] === view.sort)?.[1]} {view.desc ? '↓' : '↑'}
        </span>
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Sort and filter" className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)} data-lenis-prevent>
          <div className="flex max-h-[88svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0b0918] sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-white/10 p-4">
              {(['filter', 'sort'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] ${tab === t ? 'bg-[var(--xeno-a)] text-black' : 'text-white/60'}`}>
                  {t}
                </button>
              ))}
              <button type="button" onClick={() => setDraft(DEFAULT_VIEW)} className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 hover:text-white">
                Reset
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {tab === 'filter' ? (
                <>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Rarity</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['M', 'U', 'L', 'E', 'R', 'C'] as Rarity[]).map((r) => (
                      <button key={r} type="button" onClick={() => setDraft({ ...draft, rarities: toggle(draft.rarities, r) })} className={box(draft.rarities.includes(r))}>
                        <span className={`h-3 w-3 rounded-sm border ${draft.rarities.includes(r) ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]' : 'border-white/30'}`} />
                        <span className="font-semibold" style={{ color: RARITY[r].frame === 'holo' ? undefined : RARITY[r].frame }}>
                          {RARITY[r].frame === 'holo' ? <span className="xeno-gradient-text">{RARITY[r].name}</span> : RARITY[r].name}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Element</p>
                  <div className="grid grid-cols-3 gap-2">
                    {WHEEL.map((c) => (
                      <button key={c} type="button" onClick={() => setDraft({ ...draft, colors: toggle(draft.colors, c) })} className={box(draft.colors.includes(c))}>
                        <span>{COLORS[c].icon}</span>
                        <span style={{ color: COLORS[c].hex }}>{COLORS[c].name}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setDraft({ ...draft, owned: !draft.owned })} className={`${box(draft.owned)} mt-5 w-full`}>
                    <span className={`h-3 w-3 rounded-sm border ${draft.owned ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]' : 'border-white/30'}`} /> Owned cards only
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {[
                      [false, '↑ Ascending'],
                      [true, '↓ Descending'],
                    ].map(([d, l]) => (
                      <button key={String(d)} type="button" onClick={() => setDraft({ ...draft, desc: d as boolean })} className={box(draft.desc === d)}>
                        {l as string}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SORTS.map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setDraft({ ...draft, sort: k })} className={box(draft.sort === k)}>
                        <span className={`grid h-4 w-4 place-items-center rounded-full border ${draft.sort === k ? 'border-[var(--xeno-a)]' : 'border-white/30'}`}>
                          {draft.sort === k && <span className="h-2 w-2 rounded-full bg-[var(--xeno-a)]" />}
                        </span>
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/20 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
                Cancel
              </button>
              <button type="button" onClick={() => { onChange(draft); setOpen(false); }} className="rounded-full bg-[var(--xeno-a)] py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
