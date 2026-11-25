'use client';

/**
 * src/components/landing/Landing.tsx
 * ---------------------------------------------------------------------------
 * The marketing / landing page. One fixed WebGL stage (LandingScene) sits
 * behind a scroll story choreographed with GSAP ScrollTrigger; scroll and
 * pointer state are pushed into `landing` for the 3D scene to read.
 *
 *   01 Hero        "WE COME IN PEACE*" + saucer abducting a cow
 *   02 Manifesto   word-by-word scrubbed reveal
 *   03 Case reel   pinned horizontal scroll through famous cases
 *   04 Field guide pinned; each scroll step swaps the 3D craft on the plinth
 *   05 Numbers     live counters
 *   06 Zorp        a voxel alien you can pet / explode (3D, audio-reactive)
 *   07 Crop lab    2D canvas: carve symmetric crop circles that play notes
 *   07b Live       spotlight of the most credible real contacts (/api/matrix)
 *
 * Easter egg: the Konami code (or 5 taps on the "*mostly" sticker) summons an
 * invasion fleet in the WebGL scene.
 *   08 How it works
 *   09 CTA         magnetic "Enter the Matrix" + GitHub / Google sign-in
 *
 * Sound: an original generative soundtrack (./audio) — off until the visitor
 * opts in (browser autoplay rules); scroll depth drives its intensity.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { ArrowDown, ArrowUpRight, LogIn, X } from 'lucide-react';
import NumberTicker from '@/components/fx/NumberTicker';
import SignInButtons from '@/components/ui/SignInButtons';
import UserChip from '@/components/ui/UserChip';
import { useAuth } from '@/hooks/useAuth';
import AlienCursor from './AlienCursor';
import { CASE_REEL, FIELD_GUIDE, STEPS } from './content';
import { INVASION_EVENT, landing } from './landingStore';
import LiveTransmissions from './LiveTransmissions';
import { toLiveSighting, type LiveSighting } from '@/lib/sightings';
import { toast } from 'sonner';
import { xenoAudio } from './audio';
import CropCircleCanvas from './CropCircleCanvas';
import SubmissionModal from '@/components/ui/SubmissionModal';
import { useRouter } from 'next/navigation';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// WebGL is client-only.
const LandingScene = dynamic(() => import('./LandingScene'), { ssr: false });

const MANIFESTO =
  'Since 1947 the sky has been trying to tell us something. Mostly blurry. Occasionally radar-locked. Always ignored. So we built it a microphone — a live, planet-scale atlas where every sighting is geotagged, forensically scored and argued about in public.';

/** Pulls its child toward the cursor while hovered. */
function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 15 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 15 });
  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
}

/** Nav sound toggle with live equalizer bars. */
function SoundToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="xeno-btn" data-cursor={on ? 'MUTE' : 'SOUND'} aria-pressed={on} aria-label={on ? 'Mute soundtrack' : 'Play soundtrack'}>
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[2px] rounded-full bg-current ${on ? 'animate-[eq_0.9s_ease-in-out_infinite]' : ''}`}
            style={{ height: on ? undefined : '3px', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="hidden sm:inline">{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}

/** "Sign in" button that opens a little popover with GitHub / Google. */
function SignInPopover() {
  const { profile, providers, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  if (profile) {
    return (
      <button type="button" onClick={() => void signOut()} className="xeno-btn normal-case" data-cursor="SIGN OUT" title="Sign out">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny remote avatar
          <img src={profile.avatarUrl} alt="" className="h-4 w-4 rounded-full" />
        ) : null}
        <span className="max-w-[7rem] truncate">@{profile.operatorHandle}</span>
      </button>
    );
  }
  if (providers.length === 0) return null;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="xeno-btn" data-cursor="SIGN IN" aria-expanded={open}>
        <LogIn size={12} /> <span className="hidden sm:inline">Sign in</span>
      </button>
      {open && (
        <div className="xeno-glass absolute right-0 top-full z-50 mt-3 w-64 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/50">Verify you’re human-ish</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-white/40 hover:text-white">
              <X size={12} />
            </button>
          </div>
          <SignInButtons prefix="Continue with" className="flex-col [&>button]:justify-center" />
          <p className="mt-3 text-[10px] leading-relaxed text-white/35">No passwords. We only read your public name and avatar.</p>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
      <span className="text-[var(--xeno-a)]">{n}</span>
      <span className="h-px w-10 bg-white/20" />
      {children}
    </p>
  );
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [contacts, setContacts] = useState(0);
  const [live, setLive] = useState<LiveSighting[]>([]);
  const stickerTaps = useRef(0);
  const [reportOpen, setReportOpen] = useState(false);
  const router = useRouter();
  const [statsOn, setStatsOn] = useState(false);
  const { profile, providers } = useAuth();
  const [soundOn, setSoundOn] = useState(false);
  const toggleSound = async () => {
    if (!xenoAudio) return;
    await xenoAudio.toggle();
    setSoundOn(xenoAudio.playing);
  };

  // Hover blips on anything interactive + scroll depth → music intensity.
  useEffect(() => {
    let lastEl: Element | null = null;
    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest('a,button,[data-cursor]') ?? null;
      if (el && el !== lastEl) xenoAudio?.blip(Math.random());
      lastEl = el;
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      xenoAudio?.setIntensity(max > 0 ? scrollY / max : 0);
    };
    window.addEventListener('pointerover', onOver);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Pointer → store (for the 3D scene).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      landing.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      landing.mouse.y = -((e.clientY / innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Live contact count for the numbers section.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/matrix', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sightings?: unknown[] } | null) => {
        if (!cancelled && d?.sightings) {
          setContacts(d.sightings.length);
          setLive(
            (d.sightings as Record<string, unknown>[])
              .map(toLiveSighting)
              .filter((x): x is LiveSighting => x !== null),
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Easter egg: ↑↑↓↓←→←→BA (or 5 taps on the sticker) → invasion fleet.
  const invade = () => {
    window.dispatchEvent(new Event(INVASION_EVENT));
    toast('⚠ THEY’RE HERE', { description: 'Fleet inbound. Please remain calm and keep your cows indoors.' });
    [0, 220, 440].forEach((ms) => window.setTimeout(() => xenoAudio?.boop(), ms));
  };
  useEffect(() => {
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    const onKey = (e: KeyboardEvent) => {
      pos = e.key === code[pos] || e.key.toLowerCase() === code[pos] ? pos + 1 : e.key === code[0] ? 1 : 0;
      if (pos === code.length) {
        pos = 0;
        invade();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // --- 01 hero --------------------------------------------------------
      const heroSplit = SplitText.create('.hero-line', { type: 'chars', mask: 'chars' });
      if (!reduce) {
        gsap.from(heroSplit.chars, {
          yPercent: 130,
          rotate: () => gsap.utils.random(-25, 25),
          duration: 1.3,
          ease: 'back.out(1.6)',
          stagger: 0.04,
          delay: 0.2,
        });
        gsap.from('.hero-fade', { opacity: 0, y: 24, duration: 1, stagger: 0.12, delay: 0.9, ease: 'expo.out' });
        gsap.from('.hero-sticker', { scale: 0, rotate: -40, duration: 0.9, delay: 1.4, ease: 'back.out(2.5)' });
      }
      ScrollTrigger.create({
        trigger: '.sec-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (st) => {
          landing.heroOut = st.progress;
        },
      });
      gsap.to('.hero-title', {
        yPercent: -30,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: '.sec-hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      // --- 02 manifesto: words light up as you scroll ---------------------
      const words = SplitText.create('.manifesto', { type: 'words' });
      gsap.fromTo(
        words.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.05,
          ease: 'none',
          scrollTrigger: { trigger: '.sec-manifesto', start: 'top 75%', end: 'bottom 60%', scrub: true },
        },
      );

      // --- 03 horizontal case reel ---------------------------------------
      const track = document.querySelector<HTMLElement>('.reel-track');
      if (track) {
        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth + 48),
          ease: 'none',
          scrollTrigger: {
            trigger: '.sec-reel',
            start: 'top top',
            end: () => `+=${track.scrollWidth}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      }

      // --- 04 field guide: pinned, each step swaps the 3D craft ----------
      ScrollTrigger.create({
        trigger: '.sec-guide',
        start: 'top top',
        end: () => `+=${FIELD_GUIDE.length * window.innerHeight * 0.45}`,
        pin: true,
        onUpdate: (st) => {
          const i = Math.min(FIELD_GUIDE.length - 1, Math.floor(st.progress * FIELD_GUIDE.length));
          if (i !== landing.craftIndex) {
            landing.craftIndex = i;
            setActive(i);
            xenoAudio?.whoosh();
          }
        },
        onToggle: (st) => {
          landing.showcase = st.isActive ? 1 : 0;
        },
      });

      // --- 05 numbers ------------------------------------------------------
      ScrollTrigger.create({ trigger: '.sec-stats', start: 'top 70%', once: true, onEnter: () => setStatsOn(true) });

      // --- 06 Zorp: voxel alien visible while this section is on screen ----
      ScrollTrigger.create({
        trigger: '.sec-zorp',
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (st) => {
          landing.voxel = st.isActive ? 1 : 0;
          if (st.isActive) xenoAudio?.whoosh();
        },
      });

      // --- 08 steps: cards rise in -----------------------------------------
      gsap.from('.step-card', {
        y: 80,
        opacity: 0,
        rotate: () => gsap.utils.random(-6, 6),
        stagger: 0.12,
        duration: 1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.sec-steps', start: 'top 70%' },
      });

      // --- 07 CTA: saucer comes back -----------------------------------------
      ScrollTrigger.create({
        trigger: '.sec-cta',
        start: 'top 80%',
        end: 'top 20%',
        scrub: true,
        onUpdate: (st) => {
          landing.cta = st.progress;
        },
      });
      gsap.from('.cta-line', {
        yPercent: 110,
        stagger: 0.1,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.sec-cta', start: 'top 60%' },
      });

      return () => {
        heroSplit.revert();
        words.revert();
      };
    },
    { scope: root },
  );

  const guide = FIELD_GUIDE[active];

  return (
    <div ref={root} className="relative bg-[var(--xeno-void)] text-white">
      <LandingScene eventSource={root} />
      <AlienCursor />

      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-[var(--xeno-void)] via-[var(--xeno-void)]/70 to-transparent px-4 pb-10 pt-4 md:px-10 md:pb-12 md:pt-6">
        <Link href="/" className="font-[family-name:var(--font-display)] text-sm tracking-[0.3em]" data-cursor="HOME">
          UAP<span className="text-[var(--xeno-a)]">/</span>MATRIX
        </Link>
        <nav className="hidden items-center gap-8 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60 md:flex">
          <a href="#field-guide" className="transition hover:text-white" data-cursor="SCROLL">
            Field guide
          </a>
          <a href="#cases" className="transition hover:text-white" data-cursor="SCROLL">
            Cases
          </a>
          <Link href="/feed" className="transition hover:text-white" data-cursor="READ">
            Feed
          </Link>
          <Link href="/archive" className="transition hover:text-white" data-cursor="READ">
            Files
          </Link>
          <Link href="/arcade" className="transition hover:text-white" data-cursor="PLAY">
            Arcade
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <SoundToggle on={soundOn} onToggle={() => void toggleSound()} />
          <SignInPopover />
          <UserChip />
          <Link href="/matrix" className="xeno-btn" data-cursor="ENTER">
            Enter <ArrowUpRight size={12} />
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* 01 HERO */}
        <section className="sec-hero pointer-events-none relative flex min-h-[100svh] flex-col justify-end px-4 pb-10 md:px-10 md:pb-14">
          <div className="hero-title">
            <h1 className="font-[family-name:var(--font-display)] font-extrabold uppercase leading-[0.82] tracking-tight">
              <span className="hero-line block text-[13.5vw] md:text-[12.5vw]">We come</span>
              <span className="hero-line block text-[13.5vw] text-[var(--xeno-a)] md:text-[12.5vw]">
                in peace<span className="text-[var(--xeno-d)]">*</span>
              </span>
            </h1>
            <button
              type="button"
              onClick={() => {
                stickerTaps.current += 1;
                xenoAudio?.blip(stickerTaps.current / 5);
                if (stickerTaps.current >= 5) {
                  stickerTaps.current = 0;
                  invade();
                }
              }}
              aria-label="Mostly. (tap me)"
              className="hero-sticker pointer-events-auto absolute right-6 top-[24vh] rotate-12 rounded-full bg-[var(--xeno-d)] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black shadow-[0_0_40px_rgba(255,94,200,0.6)] md:right-[12vw] md:top-[30vh] md:text-xs">
              *mostly
            </button>
          </div>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="hero-fade pointer-events-auto max-w-md">
              <p className="text-sm leading-relaxed text-white/60 md:text-base">
                The world’s live atlas of unidentified anomalous phenomena — 1947 to tonight. Geotagged, forensically
                scored, and very slightly unhinged.
              </p>
              {!profile && providers.length > 0 && (
                <SignInButtons prefix="Join with" redirectTo="/matrix" className="mt-5" />
              )}
            </div>
            <div className="hero-fade pointer-events-auto flex items-center gap-4">
              <Magnetic>
                <Link href="/matrix" className="xeno-btn !px-6 !py-3" data-cursor="ENTER">
                  Open the atlas <ArrowUpRight size={14} />
                </Link>
              </Magnetic>
              {!soundOn && (
                <button
                  type="button"
                  onClick={() => void toggleSound()}
                  data-cursor="PLAY"
                  className="group flex items-center gap-2 rounded-full border border-[var(--xeno-d)]/50 bg-[var(--xeno-d)]/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--xeno-d)] transition hover:bg-[var(--xeno-d)] hover:text-black"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                  </span>
                  Tune in (sound)
                </button>
              )}
              <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 lg:flex">
                <ArrowDown size={12} className="animate-bounce" /> Scroll to get abducted
              </span>
            </div>
          </div>
          <p className="hero-fade pointer-events-none absolute left-1/2 top-[15vh] hidden -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.5em] text-white/30 md:block">
            psst — click the saucer
          </p>
        </section>

        {/* 02 MANIFESTO */}
        <section className="sec-manifesto relative px-4 py-[22vh] md:px-10">
          <SectionLabel n="01">Transmission</SectionLabel>
          <p className="manifesto max-w-6xl font-[family-name:var(--font-display)] text-[8vw] font-medium leading-[1.05] tracking-tight md:text-[4.2vw]">
            {MANIFESTO}
          </p>
        </section>

        {/* 03 CASE REEL */}
        <section id="cases" className="sec-reel relative flex h-[100svh] flex-col justify-center overflow-hidden">
          <div className="px-4 md:px-10">
            <SectionLabel n="02">Greatest hits from the archive</SectionLabel>
          </div>
          <div className="reel-track flex gap-5 px-4 md:gap-8 md:px-10">
            {CASE_REEL.map((c, i) => (
              <article
                key={c.title}
                data-cursor="CASE"
                className="xeno-glass group relative flex h-[58vh] w-[78vw] shrink-0 flex-col justify-between overflow-hidden p-6 transition-transform duration-500 hover:-rotate-1 hover:scale-[1.02] md:w-[34vw] md:p-8"
              >
                <span className="font-mono text-[10px] tracking-[0.3em] text-white/40">
                  CASE {String(i + 1).padStart(2, '0')} / {String(CASE_REEL.length).padStart(2, '0')}
                </span>
                <span className="xeno-gradient-text font-[family-name:var(--font-display)] text-[22vw] font-extrabold leading-none md:text-[9vw]">
                  {c.year}
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-medium md:text-3xl">{c.title}</h3>
                  <p className="mt-1 text-sm text-white/50">{c.place}</p>
                  <p className="mt-4 inline-block rounded-full border border-[var(--xeno-a)]/40 px-3 py-1 font-mono text-[9px] tracking-[0.2em] text-[var(--xeno-a)]">
                    {c.tag}
                  </p>
                </div>
              </article>
            ))}
            <Link
              href="/archive"
              data-cursor="ENTER"
              className="flex h-[58vh] w-[60vw] shrink-0 items-center justify-center font-[family-name:var(--font-display)] text-3xl text-white/70 transition hover:text-[var(--xeno-a)] md:w-[24vw]"
            >
              Open all 59 case files →
            </Link>
          </div>
        </section>

        {/* 04 FIELD GUIDE */}
        <section id="field-guide" className="sec-guide relative flex h-[100svh] items-end px-4 pb-12 md:items-center md:px-10 md:pb-0">
          <div className="w-full md:w-[46%]">
            <SectionLabel n="03">A field guide to things that are not planes</SectionLabel>
            <div className="mb-6 flex items-baseline gap-4 font-mono text-[10px] tracking-[0.3em] text-white/40">
              <span className="text-[var(--xeno-a)]">{String(active + 1).padStart(2, '0')}</span>/
              {String(FIELD_GUIDE.length).padStart(2, '0')}
              <span>FIRST LOGGED {guide.since}</span>
            </div>
            <h2
              key={guide.name}
              className="xeno-fade font-[family-name:var(--font-display)] text-[12vw] font-extrabold uppercase leading-[0.9] md:text-[5.5vw]"
            >
              {guide.name}
            </h2>
            <p key={`${guide.name}-b`} className="xeno-fade mt-5 max-w-md text-base leading-relaxed text-white/65 md:text-lg">
              {guide.blurb}
            </p>
            <div className="mt-8 flex flex-wrap gap-1.5">
              {FIELD_GUIDE.map((g, i) => (
                <span
                  key={g.name}
                  className={`h-1 rounded-full transition-all duration-500 ${i === active ? 'w-8 bg-[var(--xeno-a)]' : 'w-2 bg-white/20'}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 05 NUMBERS */}
        <section className="sec-stats relative px-4 py-[18vh] md:px-10">
          <SectionLabel n="04">By the numbers</SectionLabel>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
            {[
              { v: contacts || 28, label: 'Contacts on the globe' },
              { v: 79, label: 'Years of sky-watching' },
              { v: FIELD_GUIDE.length, label: 'Craft types catalogued' },
              { v: 100, label: 'Point credibility index' },
            ].map((s) => (
              <div key={s.label} className="border-t border-white/10 pt-5">
                <NumberTicker
                  value={statsOn ? s.v : 0}
                  className="block font-[family-name:var(--font-display)] text-6xl font-extrabold text-white md:text-8xl"
                />
                <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 06 ZORP — voxel alien (rendered in the WebGL stage) */}
        <section className="sec-zorp relative flex min-h-[100svh] items-end px-4 pb-16 md:items-center md:px-10 md:pb-0">
          <div className="max-w-md">
            <SectionLabel n="05">Meet the intern</SectionLabel>
            <h2 className="font-[family-name:var(--font-display)] text-[16vw] font-extrabold uppercase leading-[0.85] md:text-[8vw]">
              Zorp<span className="text-[var(--xeno-d)]">.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/60 md:text-lg">
              Made of {''}
              <span className="text-[var(--xeno-a)]">~1,500 cubes</span> and zero concept of personal space. Hover to pet
              him. Click to make him… briefly not exist. He grooves harder with the sound on.
            </p>
            {!soundOn && (
              <button type="button" onClick={() => void toggleSound()} className="xeno-btn mt-6" data-cursor="PLAY">
                ♪ Give Zorp a beat
              </button>
            )}
          </div>
        </section>

        {/* 07 CROP CIRCLE LAB — 2D canvas */}
        <section className="sec-crop relative px-4 py-[14vh] md:px-10">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <SectionLabel n="06">Crop circle lab</SectionLabel>
              <h2 className="font-[family-name:var(--font-display)] text-[11vw] font-extrabold uppercase leading-[0.88] md:text-[5vw]">
                Leave a<br />
                <span className="xeno-gradient-text">calling card</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/55">
              Drag across the field. Every stroke is mirrored like a real landing site and sings a note. Can’t draw? Let
              them land and take the credit.
            </p>
          </div>
          <CropCircleCanvas />
        </section>

        {/* 07b LIVE TRANSMISSIONS — real data */}
        {live.length > 0 && (
          <section className="sec-live relative px-4 py-[12vh] md:px-10">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <SectionLabel n="07">Live from the archive</SectionLabel>
                <h2 className="font-[family-name:var(--font-display)] text-[11vw] font-extrabold uppercase leading-[0.88] md:text-[5vw]">
                  Top-rated
                  <br />
                  <span className="xeno-gradient-text">weirdness</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-white/55">
                The most credible contacts on the globe right now, ranked by our forensic index. Tap one to open its full
                case file and argue with strangers about it.
              </p>
            </div>
            <LiveTransmissions sightings={live} />
          </section>
        )}

        {/* ARCADE TEASER */}
        <section className="relative px-4 py-[10vh] md:px-10">
          <Link
            href="/arcade"
            data-cursor="PLAY"
            className="xeno-glass group flex flex-col items-start justify-between gap-6 overflow-hidden p-8 md:flex-row md:items-center md:p-12"
          >
            <div>
              <SectionLabel n="★">Take a break from the truth</SectionLabel>
              <h2 className="font-[family-name:var(--font-display)] text-[11vw] font-extrabold uppercase leading-[0.88] md:text-[5vw]">
                The <span className="xeno-gradient-text">Arcade</span>
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55">
                Three original games: abduct cows before dawn, recycle humanity’s space junk off your moon, and sling debris into a
                very hungry black hole.
              </p>
            </div>
            <span className="flex gap-4 text-6xl transition-transform duration-500 group-hover:scale-110 md:text-7xl">
              <span className="inline-block group-hover:animate-bounce">🐄</span>
              <span className="inline-block [animation-delay:0.1s] group-hover:animate-bounce">🛰️</span>
              <span className="inline-block [animation-delay:0.2s] group-hover:animate-bounce">🕳️</span>
            </span>
          </Link>
        </section>

        {/* REPORT A SIGHTING */}
        <section className="relative px-4 py-[10vh] md:px-10">
          <div className="xeno-glass flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <SectionLabel n="!">Seen something weird?</SectionLabel>
              <h2 className="font-[family-name:var(--font-display)] text-[11vw] font-extrabold uppercase leading-[0.88] md:text-[5vw]">
                Report a <span className="xeno-gradient-text">sighting</span>
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55">
                Upload your photo or clip, drop a pin, and our forensics score it in seconds — EXIF check, deep-fake
                screen, aircraft &amp; satellite proximity. Credible contacts land on the live globe.
              </p>
            </div>
            <Magnetic>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                data-cursor="REPORT"
                className="rounded-full bg-[var(--xeno-d)] px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-black shadow-[0_0_50px_rgba(255,94,200,0.5)] transition hover:scale-105"
              >
                File a report ↗
              </button>
            </Magnetic>
          </div>
        </section>
        {reportOpen && (
          <SubmissionModal
            onClose={() => setReportOpen(false)}
            onSubmitted={(id) => {
              setReportOpen(false);
              if (id) router.push(`/matrix?case=${id}`);
            }}
          />
        )}

        {/* 08 HOW IT WORKS */}
        <section className="sec-steps relative px-4 py-[12vh] md:px-10">
          <SectionLabel n="08">How it works (roughly)</SectionLabel>
          <div className="grid gap-4 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} data-cursor={s.n} className="step-card xeno-glass flex min-h-[260px] flex-col justify-between p-6">
                <span className="font-mono text-xs text-[var(--xeno-a)]">{s.n}</span>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-medium">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 07 CTA */}
        <section className="sec-cta relative flex min-h-[100svh] flex-col items-center justify-end px-4 pb-24 text-center md:px-10">
          <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase leading-[0.85] tracking-tight">
            <span className="block overflow-hidden">
              <span className="cta-line block text-[13vw] md:text-[9vw]">The sky’s</span>
            </span>
            <span className="block overflow-hidden">
              <span className="cta-line xeno-gradient-text block text-[13vw] md:text-[9vw]">group chat</span>
            </span>
            <span className="block overflow-hidden">
              <span className="cta-line block text-[13vw] md:text-[9vw]">is open.</span>
            </span>
          </h2>
          <div className="mt-10 flex flex-col items-center gap-5">
            <Magnetic strength={0.5}>
              <Link
                href="/matrix"
                data-cursor="BEAM ME"
                className="group relative inline-flex h-36 w-36 items-center justify-center rounded-full bg-[var(--xeno-a)] font-[family-name:var(--font-display)] text-sm font-medium uppercase tracking-widest text-black shadow-[0_0_80px_rgba(94,255,216,0.55)] transition-transform duration-500 hover:scale-110 md:h-44 md:w-44"
              >
                Enter the
                <br />
                Matrix
              </Link>
            </Magnetic>
            {profile ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
                Signed in as <span className="text-[var(--xeno-a)]">@{profile.operatorHandle}</span>
              </p>
            ) : (
              <SignInButtons size="lg" prefix="Continue with" className="justify-center" />
            )}
          </div>
        </section>

        {/* Footer marquee */}
        <footer className="relative overflow-hidden border-t border-white/10 py-6">
          <div className="xeno-marquee font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase text-white/[0.07] md:text-8xl">
            {[0, 1].map((k) => (
              <span key={k} className="flex shrink-0 gap-12 pr-12">
                <span>The truth is out there</span>
                <span className="text-[var(--xeno-a)]/30">✦</span>
                <span>Probably</span>
                <span className="text-[var(--xeno-d)]/30">✦</span>
                <span>Keep watching the skies</span>
                <span className="text-[var(--xeno-b)]/30">✦</span>
              </span>
            ))}
          </div>
          <div className="mt-4 flex justify-between px-4 font-mono text-[9px] uppercase tracking-[0.3em] text-white/30 md:px-10">
            <span>UAP/MATRIX · est. 1947 (sort of)</span>
            <span>No cows were harmed. Several were confused.</span>
          </div>
          <div className="mt-3 px-4 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-white/45 md:px-10">
            Designed &amp; built by <span className="text-[var(--xeno-a)]">Lowkee Studios</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
