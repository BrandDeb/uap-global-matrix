import { describe, it, expect } from 'vitest';
import { Color, Object3D } from 'three';
import { GLOBE_RADIUS, latLngToCartesian, credibilityColor } from '@/lib/geo';

describe('latLngToCartesian', () => {
  it('maps the north pole to +Y', () => {
    const o = new Object3D();
    latLngToCartesian(90, 0, GLOBE_RADIUS, o);
    expect(o.position.x).toBeCloseTo(0, 5);
    expect(o.position.y).toBeCloseTo(GLOBE_RADIUS, 5);
    expect(o.position.z).toBeCloseTo(0, 5);
  });

  it('maps the south pole to -Y', () => {
    const o = new Object3D();
    latLngToCartesian(-90, 0, GLOBE_RADIUS, o);
    expect(o.position.y).toBeCloseTo(-GLOBE_RADIUS, 5);
  });

  it('keeps every point on the sphere of the given radius', () => {
    const o = new Object3D();
    const samples: ReadonlyArray<[number, number]> = [
      [0, 0],
      [45, 90],
      [-33.86, 151.2],
      [51.5, -0.12],
      [49.9453, 6.5642],
    ];
    for (const [lat, lng] of samples) {
      latLngToCartesian(lat, lng, GLOBE_RADIUS, o);
      expect(o.position.length()).toBeCloseTo(GLOBE_RADIUS, 5);
    }
  });
});

describe('credibilityColor', () => {
  it('lands exactly on the gradient stops', () => {
    expect(credibilityColor(0, new Color()).getHexString()).toBe('ef4444'); // red
    expect(credibilityColor(50, new Color()).getHexString()).toBe('f59e0b'); // amber
    expect(credibilityColor(100, new Color()).getHexString()).toBe('22d3ee'); // cyan
  });

  it('clamps out-of-range scores to the endpoints', () => {
    expect(credibilityColor(-20, new Color()).getHexString()).toBe('ef4444');
    expect(credibilityColor(999, new Color()).getHexString()).toBe('22d3ee');
  });

  it('writes into the provided target (no allocation)', () => {
    const target = new Color();
    const returned = credibilityColor(70, target);
    expect(returned).toBe(target);
  });
});
