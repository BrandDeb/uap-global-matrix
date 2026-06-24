'use client';

/**
 * src/components/map/DataPoints.tsx
 * ---------------------------------------------------------------------------
 * High-performance sighting layer for the 3D globe.
 *
 * Renders every sighting as one instance of a single `THREE.InstancedMesh`,
 * so N markers cost one draw call instead of N meshes. Each instance is:
 *   - positioned by converting (latitude, longitude) → a Cartesian point on a
 *     sphere of radius `GLOBE_RADIUS` (2), and
 *   - tinted by interpolating a credibility gradient from the sighting's
 *     `credibilityScore` (0..100).
 * ---------------------------------------------------------------------------
 */

import { useLayoutEffect, useMemo, useRef } from 'react';
import type { InstancedMesh } from 'three';
import { Color, Object3D } from 'three';
// Importing from @react-three/fiber pulls in the JSX intrinsic-element
// augmentation (<instancedMesh>, <sphereGeometry>, …) used below.
import type { ThreeElements } from '@react-three/fiber';

/** Radius of the globe the markers sit on. Must match the Earth mesh. */
export const GLOBE_RADIUS = 2;

/** Minimal data contract the map needs from a sighting. */
export interface MapSighting {
  readonly id: string;
  readonly title: string;
  readonly latitude: number;
  readonly longitude: number;
  /** Credibility Index, 0 (low) .. 100 (high). */
  readonly credibilityScore: number;
}

interface DataPointsProps {
  readonly points: readonly MapSighting[];
  /** Marker radius in world units. */
  readonly markerSize?: number;
}

/* ===========================================================================
 * Geospatial → Cartesian
 * ======================================================================== */

/**
 * Convert WGS84 (lat, lng) in degrees to a point on a sphere of `radius`,
 * writing into `target` to avoid per-call allocation. Uses the standard
 * Three.js globe convention (Y-up, longitude 0 toward -Z).
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

/* ===========================================================================
 * Credibility gradient
 * ======================================================================== */

/**
 * Tactical credibility ramp: low scores read hostile-red, mid amber, high
 * cyan. Stops are sorted by their normalized position in [0, 1].
 */
const GRADIENT_STOPS: ReadonlyArray<{ at: number; color: Color }> = [
  { at: 0.0, color: new Color('#ef4444') }, // red-500  — low credibility
  { at: 0.5, color: new Color('#f59e0b') }, // amber-500 — uncertain
  { at: 1.0, color: new Color('#22d3ee') }, // cyan-400 — high credibility
];

/**
 * Interpolate the gradient at `score` (0..100), writing the result into
 * `target`. Piecewise-linear in RGB across the stops above.
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

/* ===========================================================================
 * Component
 * ======================================================================== */

export function DataPoints({ points, markerSize = 0.018 }: DataPointsProps) {
  const meshRef = useRef<InstancedMesh>(null);

  // Reusable scratch objects — never recreated across renders/instances.
  const scratch = useMemo(() => ({ dummy: new Object3D(), color: new Color() }), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || points.length === 0) return;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      latLngToCartesian(point.latitude, point.longitude, GLOBE_RADIUS, scratch.dummy);
      scratch.dummy.updateMatrix();
      mesh.setMatrixAt(i, scratch.dummy.matrix);

      credibilityColor(point.credibilityScore, scratch.color);
      mesh.setColorAt(i, scratch.color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = points.length;
  }, [points, scratch]);

  if (points.length === 0) return null;

  // `key` forces a remount when the instance count changes, since an
  // InstancedMesh's capacity is fixed at construction via `args`.
  const meshArgs: ThreeElements['instancedMesh']['args'] = [
    undefined,
    undefined,
    points.length,
  ];

  return (
    <instancedMesh key={points.length} ref={meshRef} args={meshArgs} frustumCulled={false}>
      <sphereGeometry args={[markerSize, 12, 12]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export default DataPoints;
