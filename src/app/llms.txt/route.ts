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
    `- [Arcade](${SITE_URL}/arcade): three original UFO games.`,
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
