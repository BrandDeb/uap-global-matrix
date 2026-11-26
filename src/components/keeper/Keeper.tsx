'use client';

/**
 * /keeper: XENO KEEPER.
 *   Crash site of the day → scan for survivors (3 per day) → timing-ring
 *   catch → the alien joins your card collection.
 *   Family (up to 3 aliens): hunger + happiness drain in real time. Feed by
 *   answering a space question (learn something!), play to cheer them up.
 *   Daily care earns Energy and Keeper XP.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import XenoCard from '@/components/cards/XenoCard';
import AlienAvatar from '@/components/profile/AlienAvatar';
import { xenoAudio } from '@/components/landing/audio';
import { ARCHIVE } from '@/lib/archive';
import { CARD_BY_ID, CARDS, type CardDef } from '@/lib/cards';
import { cardAction, useCollection } from '@/lib/collection';
import { QUIZ } from '@/lib/spaceQuiz';
import { dayNumber } from '@/lib/daily';

interface Care {
  fed: number;
  played: number;
}
interface KeeperSave {
  savedAt: number;
  family: string[];
  care: Record<string, Care>;
  scanDay: number;
  scans: number;
  catches: number;
  xp: number;
  quiz: number;
}
const KEY = 'uap-keeper';
const START: KeeperSave = { savedAt: 0, family: [], care: {}, scanDay: -1, scans: 0, catches: 0, xp: 0, quiz: 0 };
const SCANS_PER_DAY = 3;
const DAY = 86_400_000;

let raw: string | null = null;
let cache = START;
function read(): KeeperSave {
  if (typeof window === 'undefined') return START;
  let r: string | null = null;
  try {
    r = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  if (r === raw) return cache;
  raw = r;
  try {
    cache = { ...START, ...(r ? JSON.parse(r) : {}) };
  } catch {
    cache = START;
  }
  return cache;
}
function write(s: KeeperSave) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(`${KEY}-change`));
  window.dispatchEvent(new Event('uap-sync-change'));
}
const sub = (cb: () => void) => {
  window.addEventListener(`${KEY}-change`, cb);
  return () => window.removeEventListener(`${KEY}-change`, cb);
};
const useKeeper = () => useSyncExternalStore(sub, read, () => START);

function adopt(id: string) {
  const s = read();
  if (s.family.includes(id) || s.family.length >= 3) return;
  const t = Date.now();
  write({ ...s, family: [...s.family, id], care: { ...s.care, [id]: { fed: t, played: t } } });
}

function feed(id: string, correct: boolean) {
  const s = read();
  const t = Date.now();
  write({ ...s, quiz: s.quiz + 1, xp: s.xp + (correct ? 30 : 5), care: { ...s.care, [id]: { ...s.care[id], fed: correct ? t : s.care[id].fed } } });
}

function playWith(id: string): boolean {
  const s = read();
  const t = Date.now();
  if (t - (s.care[id]?.played ?? 0) < 3_600_000) return false;
  write({ ...s, xp: s.xp + 10, care: { ...s.care, [id]: { ...s.care[id], played: t } } });
  return true;
}

/** 100 when just cared for, falls to 0 over ~1.5 days. */
const level = (t: number, now: number) => Math.max(0, Math.round(100 - ((now - t) / (DAY * 1.5)) * 100));

export default function Keeper() {
  const k = useKeeper();
  const col = useCollection();
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock for care meters
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const today = dayNumber();
  const site = ARCHIVE[(today * 13 + 5) % ARCHIVE.length];
  const todayIso = new Date(Date.UTC(2025, 0, 1) + today * 86_400_000).toISOString().slice(0, 10);
  const scansLeft = col.status !== 'ready' ? 0 : col.wallet.scan_day?.slice(0, 10) === todayIso ? SCANS_PER_DAY - col.wallet.scans : SCANS_PER_DAY;
  const [encounter, setEncounter] = useState<CardDef | null>(null);

  const scan = async () => {
    const d = await cardAction<{ encounter?: string }>('scan');
    if (!d.encounter) {
      toast(d.error ?? 'Scan failed.');
      return;
    }
    setEncounter(CARD_BY_ID[d.encounter]);
    xenoAudio?.whoosh();
  };

  const owned = CARDS.filter((d) => col.owned[d.id]);

  return (
    <main className="mx-auto min-h-[100svh] max-w-5xl px-4 pb-24 pt-5 md:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="xeno-btn">
          <ArrowLeft size={12} /> Home
        </Link>
        <Link href="/cards" className="xeno-btn">
          My cards ↗
        </Link>
      </header>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-6xl">
        Xeno <span className="xeno-gradient-text">Keeper</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-white/55">Rescue survivors from today’s crash site, then raise your alien family. They eat knowledge: answer space questions to feed them.</p>

      {/* Crash site */}
      <section className="xeno-glass mt-8 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--xeno-d)]">Today’s crash site</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{site.locationName}</h2>
        <p className="mt-1 text-sm text-white/55">
          Near the {site.year} “{site.title}” site. Debris still warm.
        </p>
        {encounter ? (
          <CatchGame def={encounter} onDone={async (caught) => {
            const res = await cardAction<{ caught?: boolean; isNew?: boolean; starUp?: boolean; stars?: number }>('catch', { caught });
            if (res.caught) {
              const s = read();
              write({ ...s, catches: s.catches + 1, xp: s.xp + 80 });
              toast(res.isNew ? `🛸 ${encounter.name} joined your collection!` : res.starUp ? `⭐ ${encounter.name} is now ${res.stars}★!` : `+1 ${encounter.name} shard`);
              xenoAudio?.chime();
            } else {
              toast(`${encounter.name} slipped away…`, { description: 'It will be back. They always come back.' });
            }
            setEncounter(null);
          }} />
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {col.status === 'signed-out' ? (
              <Link href="/signin?callbackUrl=/keeper" className="rounded-full bg-[var(--xeno-a)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">Sign in to start rescuing</Link>
            ) : (
            <button type="button" onClick={() => void scan()} disabled={scansLeft <= 0} className="rounded-full bg-[var(--xeno-a)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black disabled:opacity-40">
              📡 Scan for survivors
            </button>
            )}
            <span className="font-mono text-xs text-white/50">{scansLeft > 0 ? `${scansLeft} scan${scansLeft === 1 ? '' : 's'} left today` : 'Scanners recharging. New site at midnight UTC.'}</span>
          </div>
        )}
      </section>

      {/* Family */}
      <section className="mt-10">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Your family ({k.family.length}/3)</h2>
        {k.family.length === 0 && <p className="mt-3 text-sm text-white/50">Adopt up to three aliens from your collection below.</p>}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {k.family.map((id) => (
            <Pet key={id} id={id} care={k.care[id] ?? { fed: 0, played: 0 }} now={now} />
          ))}
        </div>
        {owned.length > 0 && k.family.length < 3 && (
          <>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Adopt from your collection</p>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {owned.filter((d) => !k.family.includes(d.id)).map((d) => (
                <XenoCard key={d.id} def={d} owned={col.owned[d.id]} size={110} onClick={() => adopt(d.id)} />
              ))}
            </div>
          </>
        )}
        {owned.length === 0 && (
          <p className="mt-4 text-sm text-white/50">
            No aliens yet. Scan the crash site above, or <Link href="/cards" className="text-[var(--xeno-a)] underline">summon some cards</Link>.
          </p>
        )}
      </section>
      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">Keeper XP {k.xp} · {k.catches} rescues</p>
    </main>
  );
}

/** Timing catch: stop the shrinking ring inside the target band. Rarer = faster. */
function CatchGame({ def, onDone }: { def: CardDef; onDone: (caught: boolean) => void | Promise<void> }) {
  const [r, setR] = useState(1);
  const [tries, setTries] = useState(2);
  const t0 = useRef(0);
  const speed = { C: 0.55, R: 0.75, E: 0.95, L: 1.2, U: 1.5, M: 1.8 }[def.rarity];
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      if (!t0.current) t0.current = t;
      const p = ((t - t0.current) / 1000) * speed;
      setR(1 - (p % 1));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speed]);
  const hit = r > 0.28 && r < 0.42;
  const tap = () => {
    if (hit) void onDone(true);
    else if (tries <= 1) void onDone(false);
    else {
      setTries(tries - 1);
      xenoAudio?.blip(0.2);
    }
  };
  return (
    <div className="mt-6 flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-10">
      <button type="button" onClick={tap} className="relative grid h-64 w-64 shrink-0 place-items-center rounded-full" aria-label="Catch! Tap when the ring is inside the target">
        <span className="absolute h-[42%] w-[42%] rounded-full border-4 border-[var(--xeno-a)]/50" />
        <span className="absolute h-[28%] w-[28%] rounded-full border border-dashed border-[var(--xeno-a)]/40" />
        <span className="absolute rounded-full border-4 transition-colors" style={{ width: `${r * 100}%`, height: `${r * 100}%`, borderColor: hit ? '#5effd8' : '#ff5ec8' }} />
        <AlienAvatar index={0} spec={{ ...def.art, bg: 'transparent' }} size={90} className="animate-pulse" />
      </button>
      <div className="text-center md:text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Survivor detected</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">A wild {def.name}!</p>
        <p className="mt-2 text-sm text-white/60">Tap when the ring glows teal inside the target. {tries} {tries === 1 ? 'try' : 'tries'} left.</p>
      </div>
    </div>
  );
}

function Pet({ id, care, now }: { id: string; care: Care; now: number }) {
  const def = CARD_BY_ID[id];
  const hunger = now ? level(care.fed, now) : 100;
  const joy = now ? level(care.played, now) : 100;
  const [quiz, setQuiz] = useState<number | null>(null);
  const k = read();
  const q = useMemo(() => QUIZ[(k.quiz + id.length) % QUIZ.length], [k.quiz, id]);
  const mood = hunger + joy > 140 ? '😄' : hunger + joy > 70 ? '🙂' : hunger + joy > 20 ? '😟' : '😢';
  const answer = (i: number) => {
    const correct = i === q.answer;
    feed(id, correct);
    if (correct) {
      void cardAction('quiz');
      xenoAudio?.chime();
    }
    toast(correct ? `🍽 ${def.name} loved that! +1 energy` : 'Not quite!', { description: q.fact });
    setQuiz(null);
  };
  const play = () => {
    if (!playWith(id)) {
      toast(`${def.name} is still dizzy from the last game. Try in a bit.`);
      return;
    }
    xenoAudio?.boop();
  };
  const release = () => {
    const s = read();
    write({ ...s, family: s.family.filter((x) => x !== id) });
  };
  return (
    <div className="xeno-glass p-4">
      <div className="flex items-center gap-3">
        <AlienAvatar index={0} spec={def.art} size={72} className={hunger + joy > 70 ? 'animate-[bounce_2s_infinite]' : ''} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {def.name} {mood}
          </p>
          {[
            ['Fed', hunger],
            ['Joy', joy],
          ].map(([l, v]) => (
            <div key={l as string} className="mt-1">
              <div className="flex justify-between font-mono text-[10px] text-white/45">
                <span>{l}</span>
                <span>{v}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${v}%`, background: (v as number) < 30 ? '#ff5ec8' : '#5effd8' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {quiz !== null ? (
        <div className="mt-4">
          <p className="text-sm text-white/85">{q.q}</p>
          <div className="mt-2 grid gap-2">
            {q.options.map((o, i) => (
              <button key={o} type="button" onClick={() => answer(i)} className="rounded-xl border border-white/15 px-3 py-2 text-left text-sm hover:border-[var(--xeno-a)]">
                {o}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setQuiz(1)} className="xeno-btn">🍽 Feed (quiz)</button>
          <button type="button" onClick={play} className="xeno-btn">🎾 Play</button>
          <button type="button" onClick={release} className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white">Rehome</button>
        </div>
      )}
    </div>
  );
}
