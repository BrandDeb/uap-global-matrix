/**
 * src/lib/archive.ts
 * ---------------------------------------------------------------------------
 * The curated declassified archive (1942–2026): 59 landmark cases with source
 * agency, document id, craft morphology and era. Single source of truth for
 * the /archive page, the in-memory demo store and the database seed (rows keep
 * the same stable ids everywhere, so "open on the globe" links always work).
 *
 * Data: src/data/archive.json (supplied archive, lightly curated). Entries in
 * the 2026 "PURSUE" era are shown as listed in the supplied archive.
 * ---------------------------------------------------------------------------
 */
import raw from '@/data/archive.json';
import { isSensorEvidenceType, type SensorEvidenceType } from '@/types';

export type EraTag = 'WWII_FOO_FIGHTERS' | 'BLUE_BOOK_ERA' | 'COLD_WAR_FLAPS' | 'MODERN_SENSOR_ERA' | 'PURSUE_2026_DISCLOSURE';
export type Morphology = 'DISC' | 'SPHERE' | 'TRIANGLE' | 'TIC_TAC' | 'CIGAR' | 'OVAL' | 'UNKNOWN';

export interface ArchiveCase {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly eventTimestamp: string;
  readonly year: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly locationName: string;
  readonly sourceTier: 'CLASS_A' | 'CLASS_B';
  readonly isGovDeclassified: boolean;
  readonly archiveSource: string;
  readonly documentId: string;
  readonly morphology: Morphology;
  readonly era: EraTag;
  readonly credibilityScore: number;
  readonly evidenceTypes: SensorEvidenceType[];
  readonly primarySourceUrl: string | null;
}

interface RawCase {
  id: string;
  title: string;
  description: string;
  event_timestamp: string;
  latitude: number;
  longitude: number;
  location_name: string;
  source_tier: string;
  is_gov_declassified: boolean;
  archive_source: string;
  document_id: string;
  craft_morphology: string;
  era_tag: string;
  credibility_score: number;
  evidence_types: string[];
  primary_source_url: string | null;
}

export const ARCHIVE: ReadonlyArray<ArchiveCase> = (raw as RawCase[]).map((r) => ({
  id: r.id,
  title: r.title,
  description: r.description,
  eventTimestamp: r.event_timestamp,
  year: new Date(r.event_timestamp).getUTCFullYear(),
  latitude: r.latitude,
  longitude: r.longitude,
  locationName: r.location_name,
  sourceTier: r.source_tier === 'CLASS_A' ? 'CLASS_A' : 'CLASS_B',
  isGovDeclassified: r.is_gov_declassified,
  archiveSource: r.archive_source,
  documentId: r.document_id,
  morphology: r.craft_morphology as Morphology,
  era: r.era_tag as EraTag,
  credibilityScore: r.credibility_score,
  // Eyewitness-only reports carry no sensor evidence in our enum.
  evidenceTypes: r.evidence_types.filter(isSensorEvidenceType),
  primarySourceUrl: r.primary_source_url || null,
}));

/** Era chapters — editorial copy for the archive page. */
export const ERAS: ReadonlyArray<{
  tag: EraTag;
  chapter: string;
  name: string;
  span: string;
  color: string;
  dek: string;
}> = [
  {
    tag: 'WWII_FOO_FIGHTERS',
    chapter: 'I',
    name: 'Foo Fighters',
    span: '1942 – 1946',
    color: '#ffb347',
    dek: 'The war that taught the sky to stare back. Bomber crews on both sides reported glowing balls pacing their wingtips — each side assumed it was the other’s secret weapon. Nobody’s was.',
  },
  {
    tag: 'BLUE_BOOK_ERA',
    chapter: 'II',
    name: 'The Blue Book Years',
    span: '1947 – 1969',
    color: '#5effd8',
    dek: 'A pilot says “saucer”, a newspaper prints it, and the U.S. Air Force spends 22 years and 12,618 reports trying to explain it all away. Most cases were solved. The rest are why you’re here.',
  },
  {
    tag: 'COLD_WAR_FLAPS',
    chapter: 'III',
    name: 'Cold War Flaps',
    span: '1970 – 1999',
    color: '#a58bff',
    dek: 'The mystery goes global. Jets are scrambled over Tehran, Belgium and Spain; a forest outside an RAF base becomes a legend; a mile-wide V drifts over Phoenix while thousands film it.',
  },
  {
    tag: 'MODERN_SENSOR_ERA',
    chapter: 'IV',
    name: 'The Sensor Age',
    span: '2000 – 2025',
    color: '#38e8ff',
    dek: 'Eyewitnesses give way to infrared pods, radar tracks and gun-camera footage. The Pentagon stops saying “nothing to see” and starts saying “we can’t explain this either”.',
  },
  {
    tag: 'PURSUE_2026_DISCLOSURE',
    chapter: 'V',
    name: 'The 2026 Disclosure Drops',
    span: '2026',
    color: '#ff5ec8',
    dek: 'Eight release tranches, logged here exactly as listed in the supplied archive. Read the primary sources yourself — that’s the whole point of disclosure.',
  },
];

/** How each craft shape is labelled + described on the cards. */
export const MORPHOLOGY: Record<Morphology, { label: string; note: string }> = {
  DISC: { label: 'Disc', note: 'the classic saucer' },
  SPHERE: { label: 'Sphere', note: 'orb / ball of light' },
  TRIANGLE: { label: 'Triangle', note: 'dark delta, corner lights' },
  TIC_TAC: { label: 'Tic-Tac', note: 'wingless white capsule' },
  CIGAR: { label: 'Cigar', note: 'long cylindrical body' },
  OVAL: { label: 'Oval', note: 'egg / elliptical' },
  UNKNOWN: { label: 'Undefined', note: 'shape not recorded' },
};
