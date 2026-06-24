/**
 * src/lib/geo.ts
 * ---------------------------------------------------------------------------
 * Pure geospatial + colour math for the globe layer.
 *
 * Deliberately framework-free (no React/JSX) so it is unit-testable in a plain
 * Node environment and shared by the `DataPoints` InstancedMesh component.
 * ---------------------------------------------------------------------------
 */

import { Color, Object3D } from 'three';

/** Radius of the globe markers sit on. Must match the Earth mesh. */
export const GLOBE_RADIUS = 2;

/**
 * Convert WGS84 (lat, lng) in degrees to a point on a sphere of `radius`,
 * writing into `target` to avoid per-call allocation. Standard Three.js globe
 * convention (Y-up, longitude 0 toward -Z).
 */
export function latLngToCartesian(
  latitude: number,
  longitude: number,
  radius: number,
  target: Object3D,
): void {
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);
  target.position.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * Tactical credibility ramp: low scores read hostile-red, mid amber, high cyan.
 * Stops are sorted by their normalized position in [0, 1].
 */
const GRADIENT_STOPS: ReadonlyArray<{ at: number; color: Color }> = [
  { at: 0.0, color: new Color('#ef4444') }, // red-500  — low credibility
  { at: 0.5, color: new Color('#f59e0b') }, // amber-500 — uncertain
  { at: 1.0, color: new Color('#22d3ee') }, // cyan-400 — high credibility
];

/**
 * Interpolate the gradient at `score` (0..100), writing into `target`.
 * Piecewise-linear across the stops above; clamps out-of-range scores.
 */
export function credibilityColor(score: number, target: Color): Color {
  const t = Math.min(1, Math.max(0, score / 100));

  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    const lo = GRADIENT_STOPS[i];
    const hi = GRADIENT_STOPS[i + 1];
    if (t <= hi.at) {
      const span = hi.at - lo.at || 1;
      const localT = (t - lo.at) / span;
      return target.copy(lo.color).lerp(hi.color, localT);
    }
  }
  return target.copy(GRADIENT_STOPS[GRADIENT_STOPS.length - 1].color);
}
