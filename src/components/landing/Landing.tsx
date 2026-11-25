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
 *   06 How it works
 *   07 CTA         magnetic "Enter the Matrix" + GitHub / Google sign-in
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
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import NumberTicker from '@/components/fx/NumberTicker';
import SignInButtons from '@/components/ui/SignInButtons';
import { useAuth } from '@/hooks/useAuth';
import AlienCursor from './AlienCursor';
import { CASE_REEL, FIELD_GUIDE, STEPS } from './content';
import { landing } from './landingStore';

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
  const [statsOn, setStatsOn] = useState(false);
  const { profile } = useAuth();

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
        if (!cancelled && d?.sightings) setContacts(d.sightings.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
          }
        },
        onToggle: (st) => {
          landing.showcase = st.isActive ? 1 : 0;
        },
      });

      // --- 05 numbers ------------------------------------------------------
      ScrollTrigger.create({ trigger: '.sec-stats', start: 'top 70%', once: true, onEnter: () => setStatsOn(true) });

      // --- 06 steps: cards rise in -----------------------------------------
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
        </nav>
        <Link href="/matrix" className="xeno-btn" data-cursor="ENTER">
          Enter <ArrowUpRight size={12} />
        </Link>
      </header>

      <main className="relative z-10">
        {/* 01 HERO */}
        <section className="sec-hero pointer-events-none relative flex min-h-[100svh] flex-col justify-end px-4 pb-10 md:px-10 md:pb-14">
          <div className="hero-title">
            <h1 className="font-[family-name:var(--font-display)] font-extrabold uppercase leading-[0.82] tracking-tight">
              <span className="hero-line block text-[17vw] md:text-[12.5vw]">We come</span>
              <span className="hero-line block text-[17vw] text-[var(--xeno-a)] md:text-[12.5vw]">
                in peace<span className="text-[var(--xeno-d)]">*</span>
              </span>
            </h1>
            <span className="hero-sticker absolute right-6 top-[24vh] rotate-12 rounded-full bg-[var(--xeno-d)] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black shadow-[0_0_40px_rgba(255,94,200,0.6)] md:right-[12vw] md:top-[30vh] md:text-xs">
              *mostly
            </span>
          </div>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="hero-fade max-w-md text-sm leading-relaxed text-white/60 md:text-base">
              The world’s live atlas of unidentified anomalous phenomena — 1947 to tonight. Geotagged, forensically scored,
              and very slightly unhinged.
            </p>
            <div className="hero-fade pointer-events-auto flex items-center gap-4">
              <Magnetic>
                <Link href="/matrix" className="xeno-btn !px-6 !py-3" data-cursor="ENTER">
                  Open the atlas <ArrowUpRight size={14} />
                </Link>
              </Magnetic>
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
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
              href="/matrix"
              data-cursor="ENTER"
              className="flex h-[58vh] w-[60vw] shrink-0 items-center justify-center font-[family-name:var(--font-display)] text-3xl text-white/70 transition hover:text-[var(--xeno-a)] md:w-[24vw]"
            >
              + 12,000 more on the globe →
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

        {/* 06 HOW IT WORKS */}
        <section className="sec-steps relative px-4 py-[12vh] md:px-10">
          <SectionLabel n="05">How it works (roughly)</SectionLabel>
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
        </footer>
      </main>
    </div>
  );
}
