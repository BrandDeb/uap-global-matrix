'use client';

/**
 * /hangar: server-authoritative, Spore-style craft builder with Tarkov raids.
 * Drag parts onto a blueprint hull (auto-mirror), watch it assemble live in 3D,
 * insure or secure gear, then launch a Star Forge raid. Extract after a boss to
 * keep the loot the server rolls; die and your uninsured placed parts are lost.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, Shield, Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import GameCanvas, { type GameMeta } from '@/components/arcade/GameCanvas';
import { StarForge } from '@/components/arcade/StarForge';
import BlueprintEditor from './BlueprintEditor';
import {
  blueprintStats,
  blueprintToCraft,
  craftLevel,
  partsAtRisk,
  partsOfSlot,
  PART_BY_ID,
  RARITY,
  SHIP_COLORS,
  INSURE_COST,
  isStock,
  type Blueprint,
} from '@/lib/craft';
import { hangarAction, useHangar } from '@/lib/hangarStore';
import { xenoAudio } from '@/components/landing/audio';
import type { Game } from '@/components/arcade/engine';

const Craft3D = dynamic(() => import('./Craft3D'), { ssr: false });

const META: GameMeta = {
  title: 'Star Forge',
  tagline: 'Survive the waves. After each boss an EXTRACT beacon opens — leave to keep your haul, or push deeper for more. Die and your uninsured gear is lost.',
  controls: ['Arrows / WASD fly', 'Auto-fire', 'Touch: drag to steer'],
};
const BUY_PRICE: Record<string, number> = { common: 150, rare: 450, epic: 1100, legendary: 3000 };
const sig = (b: Blueprint) => `${b.hull}|${b.color}|${[...b.modules].map((m) => `${m.part}:${m.x.toFixed(3)}:${m.y.toFixed(3)}`).sort().join(',')}`;

interface RaidResult {
  extracted: boolean;
  wave: number;
  loot?: string[];
  scrap?: number;
  lostParts?: string[];
  keptParts?: string[];
  insured?: boolean;
}

export default function Hangar() {
  const h = useHangar();
  const [mode, setMode] = useState<'build' | 'raid'>('build');
  const [insure, setInsure] = useState(false);
  const [result, setResult] = useState<RaidResult | null>(null);
  const [bp, setBp] = useState<Blueprint | null>(null);
  const game = useRef<StarForge | null>(null);
  const [canExtract, setCanExtract] = useState(false);
  const resolving = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentSig = useRef<string>('');

  const serverCraft = h.status === 'ready' ? h.hangar.craft : null;
  const serverSig = serverCraft ? sig(serverCraft) : '';

  // Seed the editable blueprint, and re-seed when the server changes it out from
  // under us (e.g. a raid stripped lost parts) rather than from our own save.
  useEffect(() => {
    if (!serverCraft) return;
    if (bp === null || (serverSig !== lastSentSig.current && serverSig !== sig(bp))) {
      setBp(serverCraft);
      lastSentSig.current = serverSig;
    }
  }, [serverSig]); // eslint-disable-line react-hooks/exhaustive-deps

  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, []);

  // Editor edits: update local immediately, debounce the server save.
  const onEdit = useCallback((next: Blueprint) => {
    setBp(next);
    lastSentSig.current = sig(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void hangarAction('craft', { craft: next });
    }, 450);
  }, []);

  // An unresolved raid (e.g. closed the tab mid-run) is abandoned safely on return.
  useEffect(() => {
    if (h.status === 'ready' && h.hangar.raid && mode === 'build') {
      void hangarAction('abort').then(() => toast('Previous raid abandoned (no loss, no loot).'));
    }
  }, [h.status, h.hangar.raid, mode]);

  // Poll the running game for the extract window.
  useEffect(() => {
    if (mode !== 'raid') return;
    const t = window.setInterval(() => setCanExtract(Boolean(game.current?.canExtract)), 200);
    return () => window.clearInterval(t);
  }, [mode]);

  if (h.status === 'loading' || (h.status === 'ready' && bp === null)) return <Shell><p className="mt-10 text-white/50">Opening the Hangar…</p></Shell>;
  if (h.status === 'signed-out')
    return (
      <Shell>
        <div className="xeno-glass mt-8 flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-white/70">Your parts and raids live on your account, so loot you earn is safe and can’t be faked.</p>
          <Link href="/signin?callbackUrl=/hangar" className="rounded-full bg-[var(--xeno-a)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">Sign in to enter the Hangar</Link>
        </div>
      </Shell>
    );

  const blueprint = bp as Blueprint;
  const stats = blueprintStats(blueprint);
  const craft = blueprintToCraft(blueprint);
  const lvl = craftLevel(h.hangar.scrap_earned);
  const atRisk = partsAtRisk(blueprint);
  const insureCost = atRisk.reduce((s, id) => s + (INSURE_COST[PART_BY_ID[id]?.rarity] ?? 0), 0);

  const resolve = async (g: Game) => {
    if (resolving.current) return;
    const sf = g as StarForge;
    if (!sf.outcome) return;
    resolving.current = true;
    const r = await hangarAction<RaidResult>('resolve', { extracted: sf.outcome.extracted, wave: sf.outcome.wave });
    setResult({ extracted: sf.outcome.extracted, wave: sf.outcome.wave, loot: r.loot, scrap: r.scrap, lostParts: r.lostParts, keptParts: r.keptParts, insured: r.insured });
    xenoAudio?.[sf.outcome.extracted ? 'chime' : 'boop']?.();
  };

  const launch = async () => {
    flushSave();
    await hangarAction('craft', { craft: blueprint }); // ensure the server has the latest build
    const r = await hangarAction<{ seed?: number; insured?: boolean }>('launch', { insure });
    if (r.error || r.seed === undefined) {
      toast(r.error ?? 'Could not launch.');
      return;
    }
    resolving.current = false;
    setResult(null);
    setMode('raid');
    xenoAudio?.whoosh();
  };

  if (mode === 'raid') {
    return (
      <Shell>
        <button type="button" onClick={() => { game.current = null; setMode('build'); void hangarAction('abort'); }} className="xeno-btn mb-4">
          <ArrowLeft size={12} /> Abandon raid
        </button>
        <div className="relative">
          <GameCanvas key={h.hangar.raid?.seed ?? 'raid'} create={() => new StarForge(craft, stats)} meta={META} gameId="star-forge" onReady={(g) => (game.current = g as StarForge)} onPhaseChange={(p, g) => p === 'over' && void resolve(g)} />
          {canExtract && (
            <button type="button" onClick={() => { game.current?.extract(); setCanExtract(false); }} className="absolute left-1/2 top-16 z-20 -translate-x-1/2 animate-pulse rounded-full bg-[var(--xeno-a)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_rgba(94,255,216,0.6)]">
              ◆ Extract now
            </button>
          )}
        </div>
        {result && <ResultModal r={result} onClose={() => { setResult(null); setMode('build'); }} />}
      </Shell>
    );
  }

  return (
    <Shell scrap={h.hangar.scrap} rank={lvl}>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* blueprint editor */}
        <div className="min-w-0">
          <BlueprintEditor bp={blueprint} owned={h.owned} onChange={onEdit} />

          {/* buy more parts */}
          <div className="mt-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Buy parts (scrap) · or loot them in raids</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {(['thrusters', 'wings', 'weapon', 'frame'] as const).flatMap((slot) =>
                partsOfSlot(slot).filter((p) => !(h.owned[p.id] > 0)).map((p) => {
                  const rc = RARITY[p.rarity];
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.name} <span className="font-mono text-[9px] uppercase text-white/35">{p.slot}</span></p>
                        <p className="truncate text-[11px] text-white/45">{p.blurb}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase text-black" style={{ background: rc.color }}>{rc.name[0]}</span>
                        <button type="button" disabled={h.hangar.scrap < BUY_PRICE[p.rarity]} onClick={() => void hangarAction('buy', { id: p.id }).then((r) => !r.error && xenoAudio?.chime())} className="rounded-full bg-[#ffd23f] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black disabled:opacity-40">🔧 {BUY_PRICE[p.rarity]}</button>
                      </div>
                    </li>
                  );
                }),
              )}
            </ul>
          </div>
        </div>

        {/* preview + stats + raid prep */}
        <div className="min-w-0">
          <div className="xeno-glass overflow-hidden" style={{ background: `radial-gradient(circle at 50% 35%, ${blueprint.color}22, #07060f 70%)` }}>
            <Craft3D bp={blueprint} className="mx-auto h-[280px] w-full" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Paint</span>
            {SHIP_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => onEdit({ ...blueprint, color: c })} className={`h-6 w-6 rounded-full transition ${blueprint.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-70 hover:opacity-100'}`} style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
            {[['Hull', `${stats.hp} hp`], ['Speed', Math.round(stats.speed)], ['Fire', `${stats.fireRate.toFixed(1)}/s`], ['Damage', stats.damage.toFixed(1)], ['Wing guns', stats.wingGuns], ['Power', stats.power]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-black/30 p-2 text-center">
                <dt className="text-white/40">{k}</dt>
                <dd className="mt-0.5 text-white">{v}</dd>
              </div>
            ))}
          </dl>

          {/* raid prep */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
            <label className="flex cursor-pointer items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm text-white/80"><Shield size={14} className="text-[var(--xeno-a)]" /> Insure loadout</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-white/45">{insureCost > 0 ? `🔧 ${insureCost}` : 'free (stock)'}</span>
                <input type="checkbox" checked={insure} disabled={insureCost === 0} onChange={(e) => setInsure(e.target.checked)} />
              </span>
            </label>
            <p className="mt-1 text-[11px] leading-snug text-white/40">Insured parts have an 80% chance to return if you die. Uninsured non-stock parts are lost. The secure part always comes home.</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs text-white/60"><Lock size={12} /> Secure part</span>
              <select value={h.hangar.secure ?? ''} onChange={(e) => void hangarAction('secure', { id: e.target.value || null })} className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-xs text-white">
                <option value="">— none —</option>
                {Object.keys(h.owned).filter((id) => !isStock(id)).map((id) => (
                  <option key={id} value={id}>{PART_BY_ID[id]?.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="button" onClick={() => void launch()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--xeno-a)] py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <Rocket size={14} /> Launch raid
          </button>
          {h.hangar.best_wave > 0 && <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Best wave {h.hangar.best_wave}</p>}
          <p className="mt-3 text-xs text-white/40">Loot drops land in your stash only if you EXTRACT. Die and the run’s loot is gone, along with any uninsured parts on your craft.</p>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, scrap, rank }: { children: React.ReactNode; scrap?: number; rank?: number }) {
  return (
    <main className="mx-auto min-h-[100svh] w-full min-w-0 max-w-6xl px-4 pb-24 pt-5 md:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="xeno-btn"><ArrowLeft size={12} /> Home</Link>
        {scrap !== undefined && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded-full border border-white/15 px-3 py-1.5">🔧 {scrap}</span>
            <span className="rounded-full border border-white/15 px-3 py-1.5">Rank {rank}</span>
          </div>
        )}
      </header>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-6xl">The <span className="xeno-gradient-text">Hangar</span></h1>
      <p className="mt-2 max-w-xl text-sm text-white/55">Drag parts onto your hull, watch it build in 3D, then raid Star Forge for loot. Extract to keep what you find, or lose it.</p>
      {children}
    </main>
  );
}

function ResultModal({ r, onClose }: { r: RaidResult; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur" onClick={onClose} data-lenis-prevent>
      <div className="xeno-glass w-full max-w-md p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <p className={`font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase ${r.extracted ? 'text-[var(--xeno-a)]' : 'text-[var(--xeno-d)]'}`}>{r.extracted ? 'Extracted' : 'Craft lost'}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Wave {r.wave}</p>
        {r.extracted ? (
          <div className="mt-5 space-y-3 text-left">
            <p className="font-mono text-xs text-white/60">🔧 +{r.scrap ?? 0} scrap banked</p>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Salvage recovered</p>
              {r.loot && r.loot.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {r.loot.map((id, i) => (
                    <li key={i} className="rounded-full px-2.5 py-1 font-mono text-[10px] text-black" style={{ background: RARITY[PART_BY_ID[id]?.rarity ?? 'common'].color }}>{PART_BY_ID[id]?.name ?? id}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-white/40">No parts this run — push deeper for better loot.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3 text-left">
            {r.lostParts && r.lostParts.length > 0 ? (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--xeno-d)]">Lost</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {r.lostParts.map((id, i) => <li key={i} className="rounded-full border border-[var(--xeno-d)]/50 px-2.5 py-1 font-mono text-[10px] text-[var(--xeno-d)]">{PART_BY_ID[id]?.name ?? id}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-white/60">{r.insured ? 'Insurance held — your gear made it home.' : 'Only stock gear was on your craft, nothing lost.'}</p>
            )}
            {r.insured && r.keptParts && r.keptParts.length > 0 && <p className="font-mono text-[10px] text-white/45">Insurance returned: {r.keptParts.filter((id) => !isStock(id)).map((id) => PART_BY_ID[id]?.name).filter(Boolean).join(', ') || 'stock only'}</p>}
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--xeno-a)] py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black"><LogOut size={14} /> Back to Hangar</button>
      </div>
    </div>
  );
}
