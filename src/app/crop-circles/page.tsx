import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listCrops } from '@/lib/db/queries';
import LikeButton from '@/components/crops/LikeButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Crop circle gallery: designs by the community',
  description: 'A public gallery of crop circles drawn by visitors in the UAP/MATRIX crop circle lab, on wheat, snow, desert, beach, moon dust and Mars. Like your favourites and make your own.',
  alternates: { canonical: '/crop-circles' },
  openGraph: { url: '/crop-circles' },
};

export default async function CropGallery({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sort = (await searchParams).sort === 'new' ? 'new' : 'top';
  const crops = await listCrops(sort).catch(() => []);
  return (
    <main className="mx-auto min-h-[100svh] max-w-6xl px-5 pb-20 pt-6">
      <Link href="/" className="xeno-btn">
        <ArrowLeft size={12} /> Home
      </Link>
      <div className="mt-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">Community gallery</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1] md:text-6xl">
            Crop <span className="xeno-gradient-text">circles</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crop-circles?sort=top" className={`xeno-btn ${sort === 'top' ? '!border-[var(--xeno-a)]' : ''}`}>Top</Link>
          <Link href="/crop-circles?sort=new" className={`xeno-btn ${sort === 'new' ? '!border-[var(--xeno-a)]' : ''}`}>New</Link>
          <Link href="/#crop-lab" className="xeno-btn">Make one ↗</Link>
        </div>
      </div>
      {crops.length === 0 ? (
        <p className="mt-16 text-center text-white/50">No circles yet. Be the first to leave a calling card.</p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {crops.map((c) => (
            <li key={c.id} className="overflow-hidden rounded-[20px] border border-white/10 bg-[#07060f]">
              <Link href={`/crop/${c.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- served from our own API, already sized */}
                <img src={`/api/crops/${c.id}/image`} alt={`Crop circle by ${c.handle} on ${c.field}`} loading="lazy" className="aspect-square w-full object-cover" />
              </Link>
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="min-w-0 truncate font-mono text-[11px] text-white/60">@{c.handle}</span>
                <LikeButton id={c.id} initial={c.likes} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
