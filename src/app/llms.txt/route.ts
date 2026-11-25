/**
 * GET /llms.txt, a plain-markdown map of the site for AI answer engines
 * (llmstxt.org convention): what the site is, key pages, and every archive
 * case with a one-line summary and a citable URL.
 */
import { ARCHIVE, ERAS } from '@/lib/archive';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export function GET(): Response {
  const lines = [
    '# UAP/MATRIX',
    '',
    '> A live, interactive atlas of well-documented UFO / UAP sightings from 1942 to 2026: a 3D globe of contacts, a curated declassified archive with source agencies and document ids, and an arcade.',
    '',
    '## Key pages',
    `- [The Files, declassified archive](${SITE_URL}/archive): ${ARCHIVE.length} landmark cases in ${ERAS.length} eras, each with source agency, document id, craft shape and primary-source link.`,
    `- [The Matrix, 3D globe](${SITE_URL}/matrix): every contact plotted by location and year, with case dossiers and discussion.`,
    `- [Arcade](${SITE_URL}/arcade): free original UFO browser games. Moo-ve It (beam up cows over five escalating nights with quotas, storms, searchlights and power-ups), Junk Invaders (recycle space junk), Gravity Janitor (black-hole debris cleanup), Radar Ghost (stealth flying past military radar). Weekly leaderboards; the top 3 earn titles in a Hall of Fame.`,
    `- [Landing page](${SITE_URL}/): an interactive scroll story with a 3D saucer, a field guide to 13 craft shapes, a voxel lineup of witness-described beings (the Grey, Flatwoods Monster, Kelly-Hopkinsville goblin, Dover Demon, Reptilian), a crop circle drawing lab on six surfaces, and a hidden easter-egg hunt.`,
    `- [Feed](${SITE_URL}/feed): newest community sighting reports.`,
    `- [Daily Challenge](${SITE_URL}/daily): one real sighting a day; guess plane, satellite/rocket, balloon or unexplained, with streaks.`,
    `- [Crop circle gallery](${SITE_URL}/crop-circles): community-drawn crop circles with likes.`,
    `- [Privacy](${SITE_URL}/privacy) · [Terms](${SITE_URL}/terms)`,
    '',
    ...ERAS.flatMap((e) => [
      `## ${e.name} (${e.span})`,
      e.dek,
      '',
      ...ARCHIVE.filter((c) => c.era === e.tag).map(
        (c) => `- [${c.title} (${c.year})](${SITE_URL}/case/${c.id}): ${c.locationName}. ${c.description} Source: ${c.archiveSource}.`,
      ),
      '',
    ]),
    'Built by Lowkee Studios.',
    '',
    'Note: credibility scores are this archive’s own index. 2026 entries are as listed in the source archive.',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
