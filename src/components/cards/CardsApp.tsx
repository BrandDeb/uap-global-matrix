'use client';

/**
 * /cards: XENO CARDS. Summon (1 or 10), collection with training and stars,
 * and the arena (async PvP against other pilots' defence teams).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Swords } from 'lucide-react';
import { toast } from 'sonner';
import XenoCard from './XenoCard';
import { xenoAudio } from '@/components/landing/audio';
import { battle, CARD_BY_ID, CARDS, COLORS, statsOf, makeFighters, powerOf, RARITY, starsFor, WHEEL, type BattleLog, type CardDef, type Fighter, type Owned, type Rarity } from '@/lib/cards';
import { cardAction, useCollection } from '@/lib/collection';
import TradesView from './TradesView';
import CardShowcase from './CardShowcase';
import Binder from './Binder';
import SortFilter, { DEFAULT_VIEW, type View } from './SortFilter';

type Tab = 'summon' | 'collection' | 'binder' | 'arena' | 'trades';

export default function CardsApp() {
  const c = useCollection();
  const [tab, setTab] = useState<Tab>('summon');
  const ready = c.status === 'ready';
  const [preview, setPreview] = useState<CardDef | null>(null);
  useEffect(() => {
    if (!ready) return;
    void cardAction<{ claimed?: boolean }>('daily').then((d) => d.claimed && toast('🎁 Daily supply drop', { description: '+1 Signal and +5 Energy. Come back tomorrow for more.' }));
  }, [ready]);
  return (
    <main className="mx-auto min-h-[100svh] w-full min-w-0 max-w-6xl px-4 pb-24 pt-5 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="xeno-btn">
          <ArrowLeft size={12} /> Home
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-full border border-white/15 px-3 py-1.5">📡 {c.wallet.signals} signals</span>
          <span className="rounded-full border border-white/15 px-3 py-1.5">⚡ {c.wallet.energy} energy</span>
        </div>
      </header>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-6xl">
        Xeno <span className="xeno-gradient-text">Cards</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-white/55">
        156 visitors across six rarities. Stack duplicates into stars (up to 14★), train them, battle and trade with other pilots. Colours beat each other in a wheel: 🔥 → ⚡ → 🌀 → 🌿 → 💧 → 🔥.
      </p>
      <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {(['summon', 'collection', 'binder', 'arena', 'trades'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={`shrink-0 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] ${tab === t ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/15 text-white' : 'border-white/15 text-white/55'}`}>
            {t}
          </button>
        ))}
      </nav>
      {c.status === 'signed-out' ? (
        <div className="xeno-glass mt-8 flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-white/70">Your collection lives on your account, so it’s safe, tradeable and can’t be lost or faked.</p>
          <Link href="/signin?callbackUrl=/cards" className="rounded-full bg-[var(--xeno-a)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">Sign in and get 10 free summons</Link>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {['mythic-first-contact', 'ultra-void', 'flatwoods', 'grey'].map((id) => (
              <XenoCard key={id} def={CARD_BY_ID[id]} size={130} onClick={() => setPreview(CARD_BY_ID[id])} />
            ))}
            {preview && <CardShowcase def={preview} onClose={() => setPreview(null)} />}
          </div>
        </div>
      ) : c.status === 'loading' ? (
        <p className="mt-10 text-white/45">Tuning the array…</p>
      ) : (
        <div className="mt-8">{tab === 'summon' ? <Summon /> : tab === 'collection' ? <CollectionView /> : tab === 'binder' ? <BinderTab /> : tab === 'arena' ? <Arena /> : <TradesView />}</div>
      )}
    </main>
  );
}

function Summon() {
  const c = useCollection();
  type Pull = { id: string; isNew: boolean; starUp: boolean; stars: number; def: CardDef };
  const [results, setResults] = useState<Pull[] | null>(null);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  const pull = async (n: 1 | 10) => {
    if (busy) return;
    setBusy(true);
    const d = await cardAction<{ results?: Omit<Pull, 'def'>[] }>('summon', { n });
    setBusy(false);
    if (!d.results) {
      toast(d.error ?? 'Not enough signals', { description: 'Earn them from the daily drop, Xeno Keeper, Daily Challenge wins and arena victories.' });
      return;
    }
    const r = d.results.map((x) => ({ ...x, def: CARD_BY_ID[x.id] }));
    setResults(r);
    setShown(0);
    const best = r.some((x) => x.def.rarity === 'M') ? 'M' : r.some((x) => x.def.rarity === 'U') ? 'U' : r.some((x) => x.def.rarity === 'L') ? 'L' : null;
    xenoAudio?.whoosh();
    r.forEach((_, i) => window.setTimeout(() => {
      setShown(i + 1);
      xenoAudio?.blip(0.3 + i / 14);
    }, 260 * (i + 1)));
    if (best) window.setTimeout(() => {
      xenoAudio?.chime();
      toast(best === 'M' ? '🌌 MYTHIC: FIRST CONTACT' : best === 'U' ? '🌈 ULTRA PULL!' : '✨ Legendary!', { description: best === 'M' ? 'One in five hundred. Screenshot this.' : 'The signal was strong today.' });
    }, 260 * r.length + 200);
  };
  return (
    <section>
      <div className="xeno-glass flex flex-col items-center gap-5 p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Deep-space signal array</p>
        <p className="max-w-md text-white/65">Point the array at the sky and see who answers. Legendary or better guaranteed within 50 summons ({50 - c.wallet.pity} to go).</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => void pull(1)} className="xeno-btn !px-6 !py-3">Summon ×1 · 📡1</button>
          <button type="button" onClick={() => void pull(10)} className="rounded-full bg-[var(--xeno-a)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">Summon ×10 · 📡10</button>
        </div>
        <p className="font-mono text-[10px] text-white/35">
          Odds: {Object.values(RARITY).map((r) => `${r.name} ${r.weight}%`).join(' · ')} · rolled on our server
        </p>
      </div>
      {results && (
        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="mt-8 flex scroll-mt-6 flex-wrap justify-center gap-4">
          {results.slice(0, shown).map((r, i) => (
            <div key={i} className="xeno-rise relative">
              <XenoCard def={r.def} owned={c.owned[r.def.id]} size={150} />
              {(r.isNew || r.starUp) && (
                <span className="absolute -right-2 -top-2 rounded-full bg-[var(--xeno-d)] px-2 py-0.5 font-mono text-[10px] font-bold text-black">{r.isNew ? 'NEW' : `${r.stars}★!`}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const VIEW_KEY = 'uap-cards-view';
const RARITY_RANK: Record<Rarity, number> = { C: 0, R: 1, E: 2, L: 3, U: 4, M: 5 };

function CollectionView() {
  const c = useCollection();
  const [view, setViewState] = useState<View>(() => {
    try {
      return { ...DEFAULT_VIEW, ...(JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null') ?? {}), q: '' };
    } catch {
      return DEFAULT_VIEW;
    }
  });
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({ ...v, q: '' }));
    } catch {
      /* ignore */
    }
  };
  const [sel, setSel] = useState<CardDef | null>(null);
  const q = view.q.trim().toLowerCase();
  const key = (d: CardDef): number | string => {
    const o = c.owned[d.id];
    const st = o ? statsOf(d, o) : null;
    switch (view.sort) {
      case 'rarity':
        return RARITY_RANK[d.rarity];
      case 'no':
        return d.no ?? 0;
      case 'power':
        return o ? powerOf(d, o) : -1;
      case 'level':
        return o?.level ?? 0;
      case 'stars':
        return o ? starsFor(o.shards) : 0;
      case 'color':
        return WHEEL.indexOf(d.color);
      case 'name':
        return d.name;
      default:
        return st ? st[view.sort] : d[view.sort];
    }
  };
  const list = CARDS.filter(
    (d) =>
      (!q || d.name.toLowerCase().includes(q)) &&
      (view.rarities.length === 0 || view.rarities.includes(d.rarity)) &&
      (view.colors.length === 0 || view.colors.includes(d.color)) &&
      (!view.owned || c.owned[d.id]),
  ).sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    const cmp = typeof ka === 'string' ? ka.localeCompare(kb as string) : ka - (kb as number);
    return (view.desc ? -cmp : cmp) || (a.no ?? 0) - (b.no ?? 0);
  });
  const ownedN = Object.keys(c.owned).length;
  return (
    <section>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
        {ownedN}/{CARDS.length} discovered · showing {list.length}
      </p>
      <SortFilter view={view} onChange={setView} />
      <div className="mt-6 grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((d) => (
          <XenoCard key={d.id} def={d} owned={c.owned[d.id]} size={168} dim={!c.owned[d.id]} onClick={() => setSel(d)} />
        ))}
      </div>
      {sel && <CardShowcase def={sel} o={c.owned[sel.id]} onClose={() => setSel(null)} />}
    </section>
  );
}

function BinderTab() {
  const c = useCollection();
  const [sel, setSel] = useState<CardDef | null>(null);
  return (
    <>
      <Binder onOpen={setSel} />
      {sel && <CardShowcase def={sel} o={c.owned[sel.id]} onClose={() => setSel(null)} />}
    </>
  );
}

interface Live {
  mine: Fighter[];
  theirs: Fighter[];
  opp: string;
  log: BattleLog[];
  step: number;
  winner: number;
}

function Arena() {
  const c = useCollection();
  const [live, setLive] = useState<Live | null>(null);
  const owned = useMemo(() => CARDS.filter((d) => c.owned[d.id]).sort((a, b) => powerOf(b, c.owned[b.id]) - powerOf(a, c.owned[a.id])), [c.owned]);
  const team = c.wallet.team.filter((id) => c.owned[id]);
  const toggle = (id: string) => void cardAction('team', { team: team.includes(id) ? team.filter((x) => x !== id) : [...team, id].slice(-3) });
  const power = team.reduce((s, id) => s + powerOf(CARD_BY_ID[id], c.owned[id]), 0);

  const fight = async () => {
    if (team.length !== 3) return;
    const d = await cardAction<{ mine?: { id: string; o: Owned }[]; opponent?: { handle: string; team: { id: string; o: Owned }[] }; seed?: number; won?: boolean; rating?: number | null }>('battle');
    if (!d.mine || !d.opponent || d.seed === undefined) {
      toast(d.error ?? 'Battle failed.');
      return;
    }
    // The server already decided the result; replaying the same seed animates it exactly.
    const opp = { handle: d.opponent.handle };
    const mine = makeFighters(d.mine, 0);
    const theirs = makeFighters(d.opponent.team, 1);
    const res = battle(makeFighters(d.mine, 0), makeFighters(d.opponent.team, 1), d.seed);
    const rating = d.rating;
    setLive({ mine, theirs, opp: opp.handle, log: res.log, step: 0, winner: res.winner });
    xenoAudio?.whoosh();
    let i = 0;
    const tick = window.setInterval(() => {
      i++;
      setLive((l) => {
        if (!l) return l;
        const e = l.log[i - 1];
        if (e) {
          const all = [...l.mine, ...l.theirs];
          const t = all.find((f) => f.id === e.target);
          const a = all.find((f) => f.id === e.actor);
          if (t) t.hp = Math.max(0, t.hp - e.dmg);
          if (e.heal && a) {
            if (a.def.color === 'purple') a.hp = Math.min(a.max, a.hp + e.heal);
            else {
              const ally = all.filter((x) => x.side === a.side && x.hp > 0).sort((x, y) => x.hp / x.max - y.hp / y.max)[0];
              if (ally) ally.hp = Math.min(ally.max, ally.hp + e.heal);
            }
          }
          if (e.mult > 1) xenoAudio?.boop();
        }
        return { ...l, step: i };
      });
      if (i >= res.log.length) {
        window.clearInterval(tick);
        const won = res.winner === 0;
        if (won) xenoAudio?.chime();
        toast(won ? '🏆 Victory!' : '💥 Defeat', { description: `${won ? '+3 energy (and a signal every 3rd win).' : '+1 energy. Train up and try again.'}${rating ? ` Arena rating ${rating}.` : ''}` });
      }
    }, 420);
  };

  if (live) {
    const done = live.step >= live.log.length;
    const last = live.log[live.step - 1];
    return (
      <section>
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">vs @{live.opp}</p>
        <div className="mt-4 grid grid-cols-2 gap-6">
          {[live.mine, live.theirs].map((side, si) => (
            <div key={si} className="space-y-3">
              {side.map((f) => (
                <div key={f.id} className={`flex items-center gap-3 rounded-2xl border border-white/10 p-2 ${f.hp <= 0 ? 'opacity-30' : ''} ${last && last.actor === f.id ? 'ring-2 ring-[var(--xeno-a)]' : ''} ${last && last.target === f.id ? 'animate-pulse' : ''}`}>
                  <XenoCard def={f.def} size={64} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{f.def.name}</p>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${(f.hp / f.max) * 100}%`, background: COLORS[f.def.color].hex }} />
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-white/45">
                      {f.hp}/{f.max}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-6 min-h-[3em] text-center text-sm text-white/75">{last?.text ?? 'Battle start!'}</p>
        {done && (
          <div className="mt-4 text-center">
            <p className={`font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase ${live.winner === 0 ? 'text-[var(--xeno-a)]' : 'text-[var(--xeno-d)]'}`}>{live.winner === 0 ? 'Victory' : 'Defeat'}</p>
            <button type="button" onClick={() => setLive(null)} className="xeno-btn mt-4">
              Back to arena
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Your team ({team.length}/3) · power {power}</p>
          <p className="mt-1 text-sm text-white/55">
            Record {c.wallet.wins}W / {c.wallet.losses}L. Your team also defends against other pilots while you’re away.
          </p>
        </div>
        <button type="button" disabled={team.length !== 3} onClick={() => void fight()} className="flex items-center gap-2 rounded-full bg-[var(--xeno-d)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black disabled:opacity-40">
          <Swords size={14} /> Find opponent
        </button>
      </div>
      {owned.length === 0 ? (
        <p className="mt-10 text-center text-white/50">No cards yet. Summon some first!</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {owned.map((d) => (
            <div key={d.id} className={`rounded-[20px] p-1 ${team.includes(d.id) ? 'ring-2 ring-[var(--xeno-d)]' : ''}`}>
              <XenoCard def={d} owned={c.owned[d.id]} size={150} onClick={() => toggle(d.id)} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
