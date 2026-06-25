/**
 * src/app/case/[id]/page.tsx
 * ---------------------------------------------------------------------------
 * Server-rendered, deep-linkable case file + full-screen operator forum.
 * Fetches the case server-side (anon, RLS) for shareability/SEO; the live
 * thread is a client island.
 * ---------------------------------------------------------------------------
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseAnonServer } from '@/lib/supabase/anon';
import { SIGHTING_DETAIL_COLUMNS, toLiveSighting, type LiveSighting } from '@/lib/sightings';
import CaseThread from '@/components/ui/CaseThread';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadCase(id: string): Promise<LiveSighting | null> {
  const supabase = getSupabaseAnonServer();
  const { data } = await supabase
    .from('v_uap_sightings')
    .select(SIGHTING_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  return data ? toLiveSighting(data as Record<string, unknown>) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await loadCase(id);
  return {
    title: c ? `${c.title} · UAP Global Matrix` : 'Case · UAP Global Matrix',
    description: c?.locationName ?? 'Declassified anomaly case file.',
  };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sighting = await loadCase(id);
  if (!sighting) notFound();

  const date = new Date(sighting.eventTimestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="min-h-screen w-full bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/?case=${sighting.id}`}
            className="font-mono text-xs text-emerald-400 transition hover:underline"
          >
            ← VIEW ON GLOBE
          </Link>
          <Link
            href="/feed"
            className="font-mono text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            GLOBAL FEED →
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <span
            className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
              sighting.isGovDeclassified
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {sighting.isGovDeclassified ? '🏛️ GOV DECLASSIFIED' : '📡 CITIZEN FEED'}
          </span>
          <h1 className="mt-3 text-2xl font-bold">{sighting.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs text-zinc-500">
            <span>📍 {sighting.locationName}</span>
            <span>🗓 {date}</span>
            <span className="text-emerald-400">CREDIBILITY {sighting.credibilityScore}%</span>
          </div>
          <p className="mt-4 font-sans leading-relaxed text-zinc-300">{sighting.description}</p>
          {sighting.evidenceTypes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sighting.evidenceTypes.map((t) => (
                <span
                  key={t}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 font-mono text-[10px]"
                >
                  {t.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <CaseThread sightingId={sighting.id} />
        </div>
      </div>
    </div>
  );
}
