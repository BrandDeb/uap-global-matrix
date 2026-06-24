import { describe, it, expect } from 'vitest';
import {
  CREDIBILITY_WEIGHTS,
  computeCredibilityIndex,
  tierFromCredibility,
  clamp01,
  type CredibilitySignals,
} from '@/lib/credibility';

const ones: CredibilitySignals = {
  mediaAuthenticity: 1,
  prosaicImprobability: 1,
  geoConsistency: 1,
  exifIntegrity: 1,
  temporalConsistency: 1,
  descriptiveRichness: 1,
};

const zeros: CredibilitySignals = {
  mediaAuthenticity: 0,
  prosaicImprobability: 0,
  geoConsistency: 0,
  exifIntegrity: 0,
  temporalConsistency: 0,
  descriptiveRichness: 0,
};

describe('CREDIBILITY_WEIGHTS', () => {
  it('sum to exactly 1 (so C ∈ [0,100])', () => {
    const sum = Object.values(CREDIBILITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('clamp01', () => {
  it('clamps to [0,1]', () => {
    expect(clamp01(-5)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(5)).toBe(1);
  });
});

describe('computeCredibilityIndex', () => {
  it('maps all-max signals to 100', () => {
    expect(computeCredibilityIndex(ones)).toBe(100);
  });

  it('maps all-zero signals to 0', () => {
    expect(computeCredibilityIndex(zeros)).toBe(0);
  });

  it('is a weighted blend (single signal contributes its weight × 100)', () => {
    const onlyAuth = { ...zeros, mediaAuthenticity: 1 };
    expect(computeCredibilityIndex(onlyAuth)).toBeCloseTo(35, 5);
    const onlyProsaic = { ...zeros, prosaicImprobability: 1 };
    expect(computeCredibilityIndex(onlyProsaic)).toBeCloseTo(20, 5);
  });

  it('rounds to two decimals (NUMERIC(5,2))', () => {
    const value = computeCredibilityIndex({ ...zeros, geoConsistency: 1 / 3 });
    expect(Number.isInteger(value * 100)).toBe(true);
  });
});

describe('tierFromCredibility', () => {
  it('maps the tier boundaries', () => {
    expect(tierFromCredibility(85)).toBe('CLASS_A');
    expect(tierFromCredibility(84.99)).toBe('CLASS_B');
    expect(tierFromCredibility(65)).toBe('CLASS_B');
    expect(tierFromCredibility(64.99)).toBe('CLASS_C');
    expect(tierFromCredibility(40)).toBe('CLASS_C');
    expect(tierFromCredibility(39.99)).toBe('FLAGGED');
    expect(tierFromCredibility(0)).toBe('FLAGGED');
  });
});
