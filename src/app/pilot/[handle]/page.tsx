import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AlienAvatar, { type Spec } from '@/components/profile/AlienAvatar';
import ShareBar from '@/components/ShareBar';
import JsonLd from '@/components/JsonLd';
import { BADGES } from '@/lib/badges';
import { cropsByHandle, pilotByHandle } from '@/lib/db/queries';
import { SITE_URL } from '@/lib/site';
import { rankOf, xpOf, type XpSource } from '@/lib/xp';

export const dynamic = 'force-dynamic';

type Prefs = XpSource & { name?: string; avatar?: number; bio?: string; custom?: Spec | null; keeper?: { xp?: number; family?: unknown[] } | null };

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const p = await pilotByHandle(handle).catch(() => null);
  if (!p) return { title: 'Pilot not found', robots: { index: false } };
  const prefs = p.prefs as Prefs;
  const r = rankOf(xpOf(prefs));
  const title = `${prefs.name || p.operator_handle} · ${r.name}`;
  return {
    title,
    description: prefs.bio || `@${p.operator_handle} is a ${r.name} on UAP/MATRIX with ${prefs.badges?.length ?? 0} badges.`,
    alternates: { canonical: `/pilot/${p.operator_handle}` },
    openGraph: { url: `/pilot/${p.operator_handle}` },
  };
}

const GAME_NAMES: Record<string, string> = { 'moove-it': 'Moo-ve It', 'junk-invaders': 'Junk Invaders', 'gravity-janitor': 'Gravity Janitor', 'radar-ghost': 'Radar Ghost', 'star-forge': 'Star Forge' };

export default async function PilotPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await pilotByHandle(handle).catch(() => null);
  if (!p) notFound();
  const prefs = p.prefs as Prefs;
  const xp = xpOf(prefs);
  const r = rankOf(xp);
  const crops = await cropsByHandle(p.operator_handle).catch(() => []);
  const bests = Object.entries(prefs.bests ?? {}).filter(([, v]) => v > 0);
  const url = `${SITE_URL}/pilot/${p.operator_handle}`;
  return (
    <main className="mx-auto min-h-[100svh] max-w-4xl px-5 pb-24 pt-6">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: prefs.name || p.operator_handle, alternateName: `@${p.operator_handle}`, description: prefs.bio || undefined }, url }} />
      <Link href="/pilots" className="xeno-btn">
        <ArrowLeft size={12} /> Pilots
      </Link>

      <section className="xeno-glass mt-8 flex flex-col items-center gap-6 p-8 text-center md:flex-row md:text-left">
        <AlienAvatar index={prefs.avatar ?? 0} spec={prefs.custom ?? null} size={150} className="shrink-0 drop-shadow-[0_0_40px_rgba(94,255,216,0.35)]" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--xeno-a)]">
            {r.icon} {r.name} · level {r.level}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-5xl">{prefs.name || p.operator_handle}</h1>
          <p className="mt-1 font-mono text-sm text-white/45">@{p.operator_handle}</p>
          {prefs.bio && <p className="mt-4 text-white/70">{prefs.bio}</p>}
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--xeno-b),var(--xeno-a))]" style={{ width: `${Math.round(r.progress * 100)}%` }} />
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            {xp.toLocaleString()} XP{r.next ? ` · ${(r.next.min - xp).toLocaleString()} to ${r.next.name}` : ''}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Badges</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BADGES.map((b) => {
            const got = prefs.badges?.includes(b.id);
            return (
              <li key={b.id} className={`rounded-2xl border p-3 text-center ${got ? 'border-[var(--xeno-a)]/40 bg-[var(--xeno-a)]/10' : 'border-white/10 opacity-35 grayscale'}`}>
                <span className="block text-3xl">{b.icon}</span>
                <span className="mt-1 block text-xs font-semibold">{b.name}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Arcade bests</h2>
          {bests.length === 0 ? (
            <p className="mt-3 text-sm text-white/40">No scores yet.</p>
          ) : (
            <ul className="mt-3 space-y-1 font-mono text-sm">
              {bests.map(([g, v]) => (
                <li key={g} className="flex justify-between rounded px-2 py-1 text-white/75 odd:bg-white/[0.03]">
                  <span>{GAME_NAMES[g] ?? g}</span>
                  <span>{v.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Records</h2>
          <ul className="mt-3 space-y-1 font-mono text-sm text-white/75">
            <li className="flex justify-between px-2 py-1">Secrets found<span>{prefs.eggs?.length ?? 0}/8</span></li>
            <li className="flex justify-between px-2 py-1">Daily wins<span>{prefs.daily?.wins ?? 0}</span></li>
            <li className="flex justify-between px-2 py-1">Best daily streak<span>🔥 {prefs.daily?.best ?? 0}</span></li>
            <li className="flex justify-between px-2 py-1">Aliens in family<span>{prefs.keeper?.family?.length ?? 0}</span></li>
          </ul>
        </div>
      </section>

      {crops.length > 0 && (
        <section className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Crop circles</h2>
          <ul className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-4">
            {crops.map((c) => (
              <li key={c.id}>
                <Link href={`/crop/${c.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- own API image */}
                  <img src={`/api/crops/${c.id}/image`} alt={`Crop circle on ${c.field}`} loading="lazy" className="aspect-square w-full rounded-2xl border border-white/10 object-cover" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ShareBar className="mt-10" url={url} text={`I'm a ${r.name} on UAP/MATRIX 🛸 Check my pilot ID:`} />
    </main>
  );
}
