import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCrop } from '@/lib/db/queries';
import LikeButton from '@/components/crops/LikeButton';
import ShareBar from '@/components/ShareBar';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await getCrop(id).catch(() => null);
  if (!c) return { title: 'Crop circle not found', robots: { index: false } };
  const title = `Crop circle by @${c.handle}`;
  const description = `A crop circle drawn on ${c.field} in the UAP/MATRIX crop circle lab. Like it, share it, or make your own.`;
  const image = { url: `/api/crops/${c.id}/image`, width: 900, height: 900, alt: title };
  return { title, description, alternates: { canonical: `/crop/${c.id}` }, openGraph: { title, description, images: [image], url: `/crop/${c.id}` }, twitter: { card: 'summary_large_image', images: [image.url] } };
}

export default async function CropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCrop(id).catch(() => null);
  if (!c) notFound();
  return (
    <main className="mx-auto min-h-[100svh] max-w-3xl px-5 pb-20 pt-6">
      <Link href="/crop-circles" className="xeno-btn">
        <ArrowLeft size={12} /> Gallery
      </Link>
      {/* eslint-disable-next-line @next/next/no-img-element -- served from our own API */}
      <img src={`/api/crops/${c.id}/image`} alt={`Crop circle by ${c.handle} on ${c.field}`} className="mt-8 w-full rounded-[24px] border border-white/10" />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm text-white/70">
          by <span className="text-[var(--xeno-a)]">@{c.handle}</span> · {c.field}
        </p>
        <LikeButton id={c.id} initial={c.likes} />
      </div>
      <ShareBar className="mt-6" url={`${SITE_URL}/crop/${c.id}`} text="I left a calling card in a field 🛸 Rate my crop circle:" />
      <Link href="/#crop-lab" className="xeno-btn mt-8">
        Make your own ↗
      </Link>
    </main>
  );
}
