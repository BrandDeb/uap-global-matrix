/**
 * /archive/[era], one statically generated page per era chapter, so each era
 * is its own search entry point (title, description, canonical, ItemList).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArchiveFiles from '@/components/archive/ArchiveFiles';
import JsonLd from '@/components/JsonLd';
import { ARCHIVE, ERAS } from '@/lib/archive';
import { SITE_URL } from '@/lib/site';

export function generateStaticParams() {
  return ERAS.map((e) => ({ era: e.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ era: string }> }): Promise<Metadata> {
  const { era } = await params;
  const e = ERAS.find((x) => x.slug === era);
  if (!e) return {};
  const n = ARCHIVE.filter((c) => c.era === e.tag).length;
  return {
    title: `${e.name} (${e.span}), ${n} UFO/UAP cases · UAP/MATRIX`,
    description: `${e.dek} ${n} documented cases with sources and document ids.`,
    alternates: { canonical: `/archive/${e.slug}` },
    openGraph: { title: `${e.name} · ${e.span}`, url: `/archive/${e.slug}` },
  };
}

export default async function EraPage({ params }: { params: Promise<{ era: string }> }) {
  const { era } = await params;
  const e = ERAS.find((x) => x.slug === era);
  if (!e) notFound();
  const cases = ARCHIVE.filter((c) => c.era === e.tag);
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${e.name} (${e.span}), UFO/UAP cases`,
          description: e.dek,
          url: `${SITE_URL}/archive/${e.slug}`,
          numberOfItems: cases.length,
          itemListElement: cases.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/case/${c.id}`, name: `${c.title} (${c.year})` })),
        }}
      />
      <ArchiveFiles only={e.tag} />
    </>
  );
}
