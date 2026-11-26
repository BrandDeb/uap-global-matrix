'use client';

/**
 * /cards: XENO CARDS. Summon (1 or 10), collection with training and stars,
 * and the arena (async PvP against other pilots' defence teams).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Swords, Zap } from 'lucide-react';
import { toast } from 'sonner';
import XenoCard from './XenoCard';
import { xenoAudio } from '@/components/landing/audio';
import { battle, CARD_BY_ID, CARDS, COLORS, levelCap, makeFighters, powerOf, RARITY, shardsToNext, starsFor, WHEEL, type BattleLog, type CardDef, type Color, type Fighter, type Owned } from '@/lib/cards';
import { claimDaily, doSummon, recordBattle, setTeam, train, useCollection } from '@/lib/collection';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'summon' | 'collection' | 'arena';

export default function CardsApp() {
  const c = useCollection();
  const [tab, setTab] = useState<Tab>('summon');
  useEffect(() => {
    if (claimDaily()) toast('🎁 Daily supply drop', { description: '+1 Signal and +5 Energy. Come back tomorrow for more.' });
  }, []);
  return (
    <main className="mx-auto min-h-[100svh] max-w-6xl px-4 pb-24 pt-5 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="xeno-btn">
          <ArrowLeft size={12} /> Home
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-full border border-white/15 px-3 py-1.5">📡 {c.signals} signals</span>
          <span className="rounded-full border border-white/15 px-3 py-1.5">⚡ {c.energy} energy</span>
        </div>
      </header>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-6xl">
        Xeno <span className="xeno-gradient-text">Cards</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-white/55">
        Summon visitors, stack duplicates into stars (up to 14★), train them, and battle other pilots. Colours beat each other in a wheel: 🔥 → ⚡ → 🌀 → 🌿 → 💧 → 🔥.
      </p>
      <nav className="mt-6 flex gap-2">
        {(['summon', 'collection', 'arena'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] ${tab === t ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/15 text-white' : 'border-white/15 text-white/55'}`}>
            {t}
          </button>
        ))}
      </nav>
      <div className="mt-8">{tab === 'summon' ? <Summon /> : tab === 'collection' ? <CollectionView /> : <Arena />}</div>
    </main>
  );
}

function Summon() {
  const c = useCollection();
  const [results, setResults] = useState<ReturnType<typeof doSummon>>(null);
  const [shown, setShown] = useState(0);
  const pull = (n: 1 | 10) => {
    const r = doSummon(n);
    if (!r) {
      toast('Not enough signals', { description: 'Earn them from the daily drop, Xeno Keeper, Daily Challenge wins and arena victories.' });
      return;
    }
    setResults(r);
    setShown(0);
    const best = r.some((x) => x.def.rarity === 'U') ? 'U' : r.some((x) => x.def.rarity === 'L') ? 'L' : null;
    xenoAudio?.whoosh();
    r.forEach((_, i) => window.setTimeout(() => {
      setShown(i + 1);
      xenoAudio?.blip(0.3 + i / 14);
    }, 260 * (i + 1)));
    if (best) window.setTimeout(() => {
      xenoAudio?.chime();
      toast(best === 'U' ? '🌈 ULTRA PULL!' : '✨ Legendary!', { description: 'The signal was strong today.' });
    }, 260 * r.length + 200);
  };
  return (
    <section>
      <div className="xeno-glass flex flex-col items-center gap-5 p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Deep-space signal array</p>
        <p className="max-w-md text-white/65">Point the array at the sky and see who answers. Legendary guaranteed within 50 summons ({50 - c.pity} to go).</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => pull(1)} className="xeno-btn !px-6 !py-3">Summon ×1 · 📡1</button>
          <button type="button" onClick={() => pull(10)} className="rounded-full bg-[var(--xeno-a)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">Summon ×10 · 📡10</button>
        </div>
        <p className="font-mono text-[10px] text-white/35">
          Odds: {Object.values(RARITY).map((r) => `${r.name} ${r.weight}%`).join(' · ')}
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

function CollectionView() {
  const c = useCollection();
  const [filter, setFilter] = useState<Color | 'all'>('all');
  const [sel, setSel] = useState<CardDef | null>(null);
  const list = CARDS.filter((d) => filter === 'all' || d.color === filter).sort((a, b) => Number(!!c.owned[b.id]) - Number(!!c.owned[a.id]) || 'URLEC'.indexOf(a.rarity) - 'URLEC'.indexOf(b.rarity));
  const ownedN = Object.keys(c.owned).length;
  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
          {ownedN}/{CARDS.length} discovered
        </span>
        {(['all', ...WHEEL] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-full border px-3 py-1 text-xs ${filter === f ? 'border-white text-white' : 'border-white/15 text-white/55'}`}>
            {f === 'all' ? 'All' : `${COLORS[f].icon} ${COLORS[f].name}`}
          </button>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((d) => (
          <XenoCard key={d.id} def={d} owned={c.owned[d.id]} size={168} dim={!c.owned[d.id]} onClick={() => setSel(d)} />
        ))}
      </div>
      {sel && <CardDetail def={sel} o={c.owned[sel.id]} onClose={() => setSel(null)} />}
    </section>
  );
}

function CardDetail({ def, o, onClose }: { def: CardDef; o?: Owned; onClose: () => void }) {
  const c = useCollection();
  const stars = o ? starsFor(o.shards) : 0;
  const next = o ? shardsToNext(o.shards) : null;
  const col = COLORS[def.color];
  const strongVs = WHEEL[(WHEEL.indexOf(def.color) + 1) % 5];
  const weakVs = WHEEL[(WHEEL.indexOf(def.color) + 4) % 5];
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur" onClick={onClose} data-lenis-prevent>
      <div className="xeno-glass flex max-h-[92svh] w-full max-w-3xl flex-col items-center gap-6 overflow-y-auto p-6 md:flex-row md:items-start" onClick={(e) => e.stopPropagation()}>
        <XenoCard def={def} owned={o} size={240} dim={!o} />
        <div className="w-full flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: col.hex }}>
            {RARITY[def.rarity].name} · {col.icon} {col.name}
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">{def.name}</h2>
          <p className="mt-2 text-sm italic text-white/60">“{def.lore}”</p>
          <p className="mt-4 text-sm text-white/75">
            <b>{col.skill}</b> (every 3rd action): {col.skillText}
          </p>
          <p className="mt-2 text-sm text-white/60">
            Strong vs {COLORS[strongVs].icon} {COLORS[strongVs].name} · Weak vs {COLORS[weakVs].icon} {COLORS[weakVs].name}
          </p>
          {o ? (
            <>
              <p className="mt-4 font-mono text-xs text-white/60">
                {stars}★ · {next === null ? 'MAX stars' : `${next} more duplicate${next === 1 ? '' : 's'} to ${stars + 1}★`} · Level {o.level}/{levelCap(stars)} · Power {powerOf(def, o)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={c.energy < 1 || o.level >= levelCap(stars)} onClick={() => train(def.id, 1) && xenoAudio?.blip(0.8)} className="xeno-btn disabled:opacity-40">
                  <Zap size={12} /> Train +1 (⚡1)
                </button>
                <button type="button" disabled={c.energy < 1 || o.level >= levelCap(stars)} onClick={() => train(def.id, 10) && xenoAudio?.chime()} className="xeno-btn disabled:opacity-40">
                  Train +10
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-white/45">Not discovered yet. Summon or catch it in Xeno Keeper.</p>
          )}
          <button type="button" onClick={onClose} className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45 hover:text-white">
            Close
          </button>
        </div>
      </div>
    </div>
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
  const { profile } = useAuth();
  const [live, setLive] = useState<Live | null>(null);
  const owned = useMemo(() => CARDS.filter((d) => c.owned[d.id]).sort((a, b) => powerOf(b, c.owned[b.id]) - powerOf(a, c.owned[a.id])), [c.owned]);
  const team = c.team.filter((id) => c.owned[id]);
  const toggle = (id: string) => setTeam(team.includes(id) ? team.filter((x) => x !== id) : [...team, id].slice(-3));
  const power = team.reduce((s, id) => s + powerOf(CARD_BY_ID[id], c.owned[id]), 0);

  const fight = async () => {
    if (team.length !== 3) return;
    const mineTeam = team.map((id) => ({ id, o: c.owned[id] }));
    if (profile) void fetch('/api/cards/team', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ team: mineTeam }) });
    const opp = (await fetch(`/api/cards/opponent?power=${power}`).then((r) => r.json())) as { handle: string; team: { id: string; o: Owned }[]; seed: number; bot: boolean };
    const mine = makeFighters(mineTeam, 0);
    const theirs = makeFighters(opp.team, 1);
    // Simulate on copies for the result; animate replays the log on fresh fighters.
    const res = battle(makeFighters(mineTeam, 0), makeFighters(opp.team, 1), opp.seed);
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
        recordBattle(won);
        if (profile && !opp.bot) void fetch('/api/cards/result', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ won }) });
        if (won) xenoAudio?.chime();
        toast(won ? '🏆 Victory!' : '💥 Defeat', { description: won ? '+3 energy (and a signal every 3rd win).' : '+1 energy. Train up and try again.' });
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
            Record {c.wins}W / {c.losses}L. {profile ? 'Your team also defends against other pilots.' : 'Sign in to battle real pilots; guests fight training drones.'}
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
