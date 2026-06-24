/**
 * src/lib/credibility.ts
 * ---------------------------------------------------------------------------
 * Pure scoring math for the Credibility Index `C`.
 *
 * Extracted from the verify route so the core domain logic is unit-testable and
 * reusable independent of the HTTP / Supabase layer. The signal-derivation
 * (EXIF/deepfake/proximity → signals) stays in the route; this module owns the
 * weighting, the [0,100] projection, and the tier mapping.
 * ---------------------------------------------------------------------------
 */

import type { ClassificationTier } from '@/types';

/** Clamp a number to [0, 1]. */
export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Normalized credibility signals, each in [0, 1]. */
export interface CredibilitySignals {
  readonly mediaAuthenticity: number;
  readonly prosaicImprobability: number;
  readonly geoConsistency: number;
  readonly exifIntegrity: number;
  readonly temporalConsistency: number;
  readonly descriptiveRichness: number;
}

/**
 * Weights for the Credibility Index. They MUST sum to 1 so that `C` lands in
 * [0, 100]. This weighting is the core domain judgement of the system — tune it
 * to reflect how much each signal should move the needle.
 */
export const CREDIBILITY_WEIGHTS = {
  mediaAuthenticity: 0.35, // 1 - deepfake probability (most important signal)
  prosaicImprobability: 0.2, // how unlikely a mundane explanation is
  geoConsistency: 0.15, // EXIF GPS vs. reported coordinates
  exifIntegrity: 0.1, // how complete the camera metadata is
  temporalConsistency: 0.1, // EXIF capture time vs. reported timestamp
  descriptiveRichness: 0.1, // quality/length of the human report
} as const;

/** Weighted linear combination of the signals, projected onto [0, 100]. */
export function computeCredibilityIndex(signals: CredibilitySignals): number {
  const c =
    signals.mediaAuthenticity * CREDIBILITY_WEIGHTS.mediaAuthenticity +
    signals.prosaicImprobability * CREDIBILITY_WEIGHTS.prosaicImprobability +
    signals.geoConsistency * CREDIBILITY_WEIGHTS.geoConsistency +
    signals.exifIntegrity * CREDIBILITY_WEIGHTS.exifIntegrity +
    signals.temporalConsistency * CREDIBILITY_WEIGHTS.temporalConsistency +
    signals.descriptiveRichness * CREDIBILITY_WEIGHTS.descriptiveRichness;
  // NUMERIC(5,2) column → two decimal places.
  return Math.round(clamp01(c) * 10000) / 100;
}

/** Map the automated score onto the `classification_tier` enum. */
export function tierFromCredibility(credibility: number): ClassificationTier {
  if (credibility >= 85) return 'CLASS_A';
  if (credibility >= 65) return 'CLASS_B';
  if (credibility >= 40) return 'CLASS_C';
  return 'FLAGGED';
}
