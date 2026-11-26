'use client';

/**
 * src/components/archive/ArchiveFiles.tsx
 * ---------------------------------------------------------------------------
 * "THE FILES", the declassified archive (1942–2026) as an editorial,
 * interactive experience:
 *   - era chapters with written intros and their own accent color
 *   - dossier cards: document-id tab, stamp, craft-shape glyph, evidence,
 *     credibility meter, source agency
 *   - the story sits under REDACTION bars: hover / focus / tap to declassify
 *     (or flip the global "declassify everything" switch)
 *   - filter by craft shape; sticky era navigator with scroll progress
 *   - every file links to its spot on the globe and its primary source
 * ---------------------------------------------------------------------------
 */

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import { ArrowLeft, ArrowUpRight, Globe2 } from 'lucide-react';
import { ARCHIVE, ERAS, MORPHOLOGY, type ArchiveCase, type EraTag, type Morphology } from '@/lib/archive';

// WebGL is client-only; both pieces load lazily.
const CraftView = dynamic(() => import('./CraftViews').then((m) => m.CraftView), { ssr: false });
const CraftStage = dynamic(() => import('./CraftViews').then((m) => m.CraftStage), { ssr: false });

/** Tiny line glyph per craft shape. */
function ShapeGlyph({ m, color }: { m: Morphology; color: string }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 2 } as const;
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-hidden>
      {m === 'DISC' && (
        <>
          <ellipse cx="24" cy="18" rx="20" ry="5" {...s} />
          <path d="M15 16a9 7 0 0 1 18 0" {...s} />
        </>
      )}
      {m === 'SPHERE' && <circle cx="24" cy="16" r="10" {...s} />}
      {m === 'TRIANGLE' && (
        <>
          <path d="M24 5 L42 27 L6 27 Z" {...s} />
          <circle cx="24" cy="9" r="1.6" fill={color} />
          <circle cx="10" cy="25" r="1.6" fill={color} />
          <circle cx="38" cy="25" r="1.6" fill={color} />
        </>
      )}
      {m === 'TIC_TAC' && <rect x="6" y="10" width="36" height="12" rx="6" {...s} />}
      {m === 'CIGAR' && (
        <>
          <rect x="3" y="12" width="42" height="8" rx="4" {...s} />
          <path d="M14 16h20" {...s} strokeDasharray="2 3" />
        </>
      )}
      {m === 'OVAL' && <ellipse cx="24" cy="16" rx="10" ry="13" {...s} />}
      {m === 'UNKNOWN' && (
        <text x="24" y="23" textAnchor="middle" fontSize="20" fill={color} fontFamily="monospace">
          ?
        </text>
      )}
    </svg>
  );
}

/** Description under black redaction bars until revealed. */
function Redacted({ text, open }: { text: string; open: boolean }) {
  const words = text.split(' ');
  return (
    <p className="text-sm leading-relaxed text-white/75">
      {words.map((w, i) => {
        // Redact roughly every other chunk so it reads like a real blacked-out memo.
        const hidden = !open && (i % 5 === 1 || i % 5 === 2 || i % 7 === 4);
        return (
          <span key={i}>
            <span
              className={`relative transition-[background-color,color] duration-500 ${hidden ? 'rounded-[2px] bg-black text-transparent' : ''}`}
              style={{ transitionDelay: open ? `${(i % 12) * 25}ms` : '0ms' }}
            >
              {w}
            </span>{' '}
          </span>
        );
      })}
    </p>
  );
}

function FileCard({ c, color, allOpen }: { c: ArchiveCase; color: string; allOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const revealed = allOpen || open;
  const stageRef = useRef<HTMLDivElement>(null);
  const onScreen = useInView(stageRef, { margin: '120px 0px' });
  const pursue = c.era === 'PURSUE_2026_DISCLOSURE';
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
      onFocus={() => setOpen(true)}
      tabIndex={0}
      data-cursor="DECLASSIFY"
      className="group relative flex min-w-0 flex-col rounded-[22px] border border-white/10 bg-[#0a0816] p-6 pt-9 outline-none transition-colors duration-500 hover:border-white/25 focus-visible:border-white/40"
    >
      {/* folder tab */}
      <span
        className="absolute -top-3 left-6 rounded-t-lg rounded-br-lg px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-black"
        style={{ background: color }}
      >
        {c.documentId}
      </span>
      {/* stamp */}
      <span
        className={`pointer-events-none absolute right-5 top-5 rotate-[8deg] rounded border-2 px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.25em] transition-opacity duration-500 ${
          revealed ? 'opacity-90' : 'opacity-40'
        }`}
        style={{ borderColor: color, color }}
      >
        {pursue ? 'AS LISTED' : c.isGovDeclassified ? 'DECLASSIFIED' : 'CIVILIAN FILE'}
      </span>

      {/* 3D model of the reported craft (rendered via the shared canvas) */}
      <div ref={stageRef} className="relative -mx-2 mb-3 h-36 overflow-hidden rounded-2xl" style={{ background: `radial-gradient(circle at 50% 60%, ${color}22, transparent 70%)` }}>
        {onScreen && <CraftView morphology={c.morphology} className="absolute inset-0" />}
        <span className="absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
          As described: {MORPHOLOGY[c.morphology].note}
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold leading-none" style={{ color }}>
          {c.year}
        </span>
        <div className="flex flex-col items-end">
          <ShapeGlyph m={c.morphology} color={color} />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">{MORPHOLOGY[c.morphology].label}</span>
        </div>
      </div>

      <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl font-medium leading-snug text-white">{c.title}</h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">{c.locationName}</p>

      <div className="mt-4 flex-1">
        <Redacted text={c.description} open={revealed} />
        {!revealed && (
          <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.3em] text-white/30">
            ▸ hover / tap to declassify
          </span>
        )}
      </div>

      {c.evidenceTypes.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {c.evidenceTypes.map((e) => (
            <li key={e} className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] text-white/55">
              {e.replace(/_/g, ' ')}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          <span>Credibility</span>
          <span style={{ color }}>{Math.round(c.credibilityScore)}%</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-1000"
            style={{ width: revealed ? `${c.credibilityScore}%` : '8%', background: color }}
          />
        </div>
      </div>

      <footer className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
        <span className="min-w-0 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/35" title={c.archiveSource}>
          {c.archiveSource}
        </span>
        <span className="flex shrink-0 gap-3">
          <Link
            href={`/matrix?case=${c.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white"
            aria-label={`Show ${c.title} on the globe`}
          >
            <Globe2 size={12} /> Globe
          </Link>
          {c.primarySourceUrl && (
            <a
              href={c.primarySourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] hover:underline"
              style={{ color }}
            >
              Source <ArrowUpRight size={11} />
            </a>
          )}
        </span>
      </footer>
    </motion.article>
  );
}

const SHAPES: ReadonlyArray<Morphology | 'ALL'> = ['ALL', 'DISC', 'SPHERE', 'TRIANGLE', 'TIC_TAC', 'CIGAR', 'OVAL'];

export default function ArchiveFiles({ only }: { only?: EraTag } = {}) {
  const [shape, setShape] = useState<Morphology | 'ALL'>('ALL');
  const [allOpen, setAllOpen] = useState(false);

  const byEra = useMemo(
    () =>
      ERAS.filter((era) => !only || era.tag === only).map((era) => ({
        era,
        cases: ARCHIVE.filter((c) => c.era === era.tag && (shape === 'ALL' || c.morphology === shape)).sort((a, b) =>
          a.eventTimestamp.localeCompare(b.eventTimestamp),
        ),
      })),
    [shape, only],
  );

  const shapeCounts = useMemo(() => {
    const m = new Map<Morphology, number>();
    for (const c of ARCHIVE) m.set(c.morphology, (m.get(c.morphology) ?? 0) + 1);
    return m;
  }, []);
  const topShape = [...shapeCounts.entries()].filter(([k]) => k !== 'UNKNOWN').sort((a, b) => b[1] - a[1])[0];
  const govShare = Math.round((ARCHIVE.filter((c) => c.isGovDeclassified).length / ARCHIVE.length) * 100);
  const firstYear = Math.min(...ARCHIVE.map((c) => c.year));
  const lastYear = Math.max(...ARCHIVE.map((c) => c.year));

  return (
    <main className="relative min-h-[100svh] pb-24 text-white">
      <CraftStage />
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--xeno-void)]/80 px-4 py-3 backdrop-blur-xl md:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="xeno-btn">
            <ArrowLeft size={12} /> Home
          </Link>
          <nav className="flex gap-1 overflow-x-auto" aria-label="Eras">
            {ERAS.map((e) => (
              <a
                key={e.tag}
                href={only ? `/archive/${e.slug}` : `#${e.tag}`}
                className="whitespace-nowrap rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55 transition hover:bg-white/5 hover:text-white"
              >
                <span style={{ color: e.color }}>{e.chapter}</span> <span className="hidden md:inline">{e.name}</span>
              </a>
            ))}
          </nav>
          <Link href="/matrix" className="xeno-btn hidden sm:inline-flex">
            Globe <ArrowUpRight size={12} />
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="px-4 pb-16 pt-[12vh] md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">The declassified archive</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[20vw] font-extrabold uppercase leading-[0.92] tracking-tight md:text-[14vw]">
          The <span className="xeno-gradient-text">Files</span>
        </h1>
        <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <p className="max-w-xl text-lg leading-relaxed text-white/65 md:text-xl">
            {ARCHIVE.length} landmark cases. {lastYear - firstYear} years. Pilots, radar operators, schoolchildren and
            a few very confused generals, pulled from military logs, intelligence memos and government vaults, and
            filed in the order the sky filed them.
          </p>
          <dl className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">Government-sourced</dt>
              <dd className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--xeno-a)]">{govShare}%</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">Most-seen shape</dt>
              <dd className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--xeno-b)]">
                {topShape ? MORPHOLOGY[topShape[0]].label : ' - '}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">Eras</dt>
              <dd className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--xeno-d)]">{ERAS.length}</dd>
            </div>
          </dl>
        </div>

        {/* controls */}
        <div className="mt-12 flex flex-wrap items-center gap-2">
          {SHAPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setShape(s)}
              aria-pressed={shape === s}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                shape === s ? 'border-white bg-white text-black' : 'border-white/15 text-white/60 hover:text-white'
              }`}
            >
              {s === 'ALL' ? `All ${ARCHIVE.length}` : `${MORPHOLOGY[s].label} ${shapeCounts.get(s) ?? 0}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAllOpen((v) => !v)}
            aria-pressed={allOpen}
            className={`ml-auto rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
              allOpen ? 'border-[var(--xeno-d)] bg-[var(--xeno-d)] text-black' : 'border-[var(--xeno-d)]/50 text-[var(--xeno-d)]'
            }`}
          >
            {allOpen ? '■ Re-classify' : '▶ Declassify everything'}
          </button>
        </div>
      </section>

      {/* eras */}
      {byEra.map(({ era, cases }) => (
        <section key={era.tag} id={era.tag} className="scroll-mt-20 px-4 py-14 md:px-10">
          <div className="mb-10 grid gap-6 border-t pt-8 md:grid-cols-[auto_1fr] md:gap-12" style={{ borderColor: `${era.color}40` }}>
            <span
              className="font-[family-name:var(--font-display)] text-[28vw] font-extrabold leading-[0.75] md:text-[11vw]"
              style={{ color: 'transparent', WebkitTextStroke: `2px ${era.color}` }}
              aria-hidden
            >
              {era.chapter}
            </span>
            <div className="self-end">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: era.color }}>
                Chapter {era.chapter} · {era.span}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-none md:text-6xl">
                {era.name}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">{era.dek}</p>
            </div>
          </div>
          {cases.length === 0 ? (
            <p className="font-mono text-xs text-white/30">No {shape === 'ALL' ? '' : MORPHOLOGY[shape as Morphology].label.toLowerCase()} files in this era.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {cases.map((c) => (
                <FileCard key={c.id} c={c} color={era.color} allOpen={allOpen} />
              ))}
            </div>
          )}
        </section>
      ))}

      <p className="mx-auto mt-10 max-w-2xl px-4 text-center font-mono text-[10px] leading-relaxed tracking-[0.15em] text-white/30">
        Credibility scores are this archive’s own index, not an official rating. Source links point to the holding
        archive or reading room, dig in, and make up your own mind.
        <br />
        Curated, designed &amp; built by <span className="text-[var(--xeno-a)]">Lowkee Studios</span>.
      </p>
    </main>
  );
}
