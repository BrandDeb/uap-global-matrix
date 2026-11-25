import type { Metadata } from 'next';
import ArchiveFiles from '@/components/archive/ArchiveFiles';
import JsonLd from '@/components/JsonLd';
import { ARCHIVE } from '@/lib/archive';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'The Files — Declassified UFO/UAP Archive 1942–2026 · UAP/MATRIX',
  description:
    '59 landmark, well-documented UFO/UAP cases from 1942 to 2026 — WWII foo fighters, Project Blue Book, Cold War radar intercepts and modern FLIR footage — each with source agency, document id and craft shape.',
  alternates: { canonical: '/archive' },
  openGraph: { title: 'The Files — 84 years of UFO/UAP cases', url: '/archive' },
};

/** Plain-language answers (AEO): shown on the page and mirrored as FAQPage schema. */
const FAQ: ReadonlyArray<[q: string, a: string]> = [
  [
    'What is the best-documented UFO case?',
    'Few cases combine as many independent sensors as the 2004 USS Nimitz “Tic Tac” encounter: ship radar tracks, multiple aircrew eyewitnesses and an infrared (FLIR) video later released by the U.S. Department of Defense. Other strong multi-sensor cases include the 1952 Washington D.C. radar-visual flap and the 1976 Tehran F-4 intercept.',
  ],
  [
    'What was Project Blue Book?',
    'Project Blue Book was the U.S. Air Force’s official UFO investigation program from 1952 to 1969. It logged 12,618 reports; most were explained as aircraft, balloons, astronomical objects or hoaxes, while 701 remained officially “unidentified” when it closed.',
  ],
  [
    'What were the WWII “foo fighters”?',
    '“Foo fighters” was the nickname Allied aircrews gave to glowing orbs that appeared to pace their aircraft over Europe and the Pacific in 1944–45. Each side suspected the other’s secret weapon; after the war, neither turned out to have one.',
  ],
  [
    'Does “unidentified” mean alien?',
    'No. UAP means unidentified anomalous phenomena — something that couldn’t be identified with the data available. Many cases are later explained (balloons, drones, sensor artifacts, misidentified aircraft); a small remainder stay unexplained because the data is insufficient, not because aliens were confirmed.',
  ],
  [
    'Where can I read the original documents?',
    'Each case file on this page links to the archive that holds its records — for example the U.S. National Archives (Project Blue Book), the FBI Vault, the CIA Reading Room, the UK National Archives and AARO.',
  ],
];

export default function ArchivePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Dataset',
              name: 'Declassified UFO/UAP Archive 1942–2026',
              description: metadata.description,
              url: `${SITE_URL}/archive`,
              temporalCoverage: '1942/2026',
              spatialCoverage: 'Worldwide',
              keywords: ['UFO', 'UAP', 'declassified', 'Project Blue Book', 'foo fighters', 'AARO', 'FOIA'],
              creator: { '@type': 'Organization', name: 'UAP/MATRIX', url: SITE_URL },
              isAccessibleForFree: true,
            },
            {
              '@type': 'ItemList',
              name: 'Landmark UFO/UAP cases',
              numberOfItems: ARCHIVE.length,
              itemListElement: ARCHIVE.map((c, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE_URL}/case/${c.id}`,
                name: `${c.title} (${c.year})`,
              })),
            },
            {
              '@type': 'FAQPage',
              mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
            },
          ],
        }}
      />
      <ArchiveFiles />
      <section className="mx-auto max-w-3xl px-4 pb-32 text-white md:px-0" aria-labelledby="faq">
        <h2 id="faq" className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase md:text-4xl">
          Quick answers
        </h2>
        <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="cursor-pointer list-none text-lg text-white/90 marker:hidden">
                <span className="mr-2 text-[var(--xeno-a)] transition group-open:rotate-90">▸</span>
                {q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
