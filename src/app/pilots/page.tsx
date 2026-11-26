import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AlienAvatar, { type Spec } from '@/components/profile/AlienAvatar';
import { recentPilots } from '@/lib/db/queries';
import { rankOf, xpOf, type XpSource } from '@/lib/xp';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Pilots: ranks and profiles',
  description: 'The UAP/MATRIX pilot roster: ranks, XP, badges and alien avatars of the community.',
  alternates: { canonical: '/pilots' },
};

type Prefs = XpSource & { name?: string; avatar?: number; custom?: Spec | null };

export default async function Pilots() {
  const rows = await recentPilots().catch(() => []);
  const pilots = rows
    .map((p) => {
      const prefs = p.prefs as Prefs;
      const xp = xpOf(prefs);
      return { handle: p.operator_handle, name: prefs.name || p.operator_handle, avatar: prefs.avatar ?? 0, custom: prefs.custom ?? null, xp, rank: rankOf(xp) };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 100);
  return (
    <main className="mx-auto min-h-[100svh] max-w-4xl px-5 pb-24 pt-6">
      <Link href="/" className="xeno-btn">
        <ArrowLeft size={12} /> Home
      </Link>
      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">The roster</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-6xl">
        Top <span className="xeno-gradient-text">pilots</span>
      </h1>
      <p className="mt-3 text-white/55">Ranked by XP. Sign in to get your own pilot page and ID card.</p>
      {pilots.length === 0 ? (
        <p className="mt-12 text-white/45">No pilots yet. Be the first.</p>
      ) : (
        <ol className="mt-8 space-y-2">
          {pilots.map((p, i) => (
            <li key={p.handle}>
              <Link href={`/pilot/${p.handle}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 transition hover:border-[var(--xeno-a)]/40">
                <span className="w-8 font-mono text-sm text-white/40">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                <AlienAvatar index={p.avatar} spec={p.custom} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
                    {p.rank.icon} {p.rank.name}
                  </span>
                </span>
                <span className="font-mono text-sm text-white/70">{p.xp.toLocaleString()} XP</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
