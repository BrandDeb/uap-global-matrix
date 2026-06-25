'use client';

/**
 * src/components/map/DataPoints.tsx
 * ---------------------------------------------------------------------------
 * High-performance sighting layer for the 3D globe.
 *
 * Renders every sighting as one instance of a single THREE.InstancedMesh, so N
 * markers cost one draw call instead of N meshes. Positioning (lat/lng → sphere)
 * and credibility colouring live in the framework-free, unit-tested `@/lib/geo`
 * module.
 * ---------------------------------------------------------------------------
 */

import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
// Importing from @react-three/fiber pulls in the JSX intrinsic-element
// augmentation (<instancedMesh>, <sphereGeometry>, …) used below.
import type { ThreeElements, ThreeEvent } from '@react-three/fiber';
import { GLOBE_RADIUS, latLngToCartesian, credibilityColor } from '@/lib/geo';

export { GLOBE_RADIUS };

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
  /** Called with the clicked sighting's id (R3F instanced raycasting). */
  readonly onSelect?: (id: string) => void;
}

export function DataPoints({ points, markerSize = 0.018, onSelect }: DataPointsProps) {
  const meshRef = useRef<InstancedMesh>(null);

  // Instanced raycasting: `e.instanceId` is the index into `points`.
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // don't click "through" to markers behind the globe
    if (e.instanceId !== undefined && onSelect) {
      onSelect(points[e.instanceId].id);
    }
  };

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
    <instancedMesh
      key={points.length}
      ref={meshRef}
      args={meshArgs}
      frustumCulled={false}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <sphereGeometry args={[markerSize, 12, 12]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export default DataPoints;
