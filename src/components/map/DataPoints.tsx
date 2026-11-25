'use client';

/**
 * src/components/map/DataPoints.tsx
 * ---------------------------------------------------------------------------
 * High-performance sighting layer for the 3D globe.
 *
 * Renders every sighting as one instance of a single THREE.InstancedMesh, so N
 * markers cost one draw call instead of N meshes. Capacity grows in powers of 2
 * so timeline scrubbing updates `mesh.count` in place without remounting GPU
 * buffers on every year tick.
 * ---------------------------------------------------------------------------
 */

import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Object3D, type InstancedMesh } from 'three';
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
  /** Called with the hovered sighting's id (or null on exit). */
  readonly onHover?: (id: string | null) => void;
}

function bucketCapacity(n: number): number {
  if (n <= 64) return 64;
  return 1 << Math.ceil(Math.log2(n));
}

export function DataPoints({ points, markerSize = 0.022, onSelect, onHover }: DataPointsProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const beamRef = useRef<InstancedMesh>(null);
  const lastHoveredRef = useRef<string | null>(null);

  const capacity = bucketCapacity(points.length);

  // Instanced raycasting: `e.instanceId` is the index into `points`.
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < points.length && onSelect) {
      onSelect(points[e.instanceId].id);
    }
  };

  // Reusable scratch objects — never recreated across renders/instances.
  const scratch = useMemo(() => ({ dummy: new Object3D(), color: new Color() }), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const beams = beamRef.current;
    if (!mesh) return;

    mesh.count = points.length;
    if (beams) beams.count = points.length;

    if (points.length === 0) return;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      latLngToCartesian(point.latitude, point.longitude, GLOBE_RADIUS, scratch.dummy);
      scratch.dummy.scale.set(1, 1, 1);
      scratch.dummy.rotation.set(0, 0, 0);
      scratch.dummy.updateMatrix();
      mesh.setMatrixAt(i, scratch.dummy.matrix);

      credibilityColor(point.credibilityScore, scratch.color);
      mesh.setColorAt(i, scratch.color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Reset cached boundingSphere so Three.js raycaster recomputes it for new instances.
    mesh.boundingSphere = null;

    if (beams) {
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        latLngToCartesian(point.latitude, point.longitude, GLOBE_RADIUS, scratch.dummy);
        const h = 0.05 + (point.credibilityScore / 100) * 0.24;
        scratch.dummy.lookAt(0, 0, 0);
        scratch.dummy.rotateX(-Math.PI / 2);
        scratch.dummy.translateY(h / 2);
        scratch.dummy.scale.set(1, h, 1);
        scratch.dummy.updateMatrix();
        beams.setMatrixAt(i, scratch.dummy.matrix);
        scratch.dummy.scale.set(1, 1, 1);
        scratch.dummy.rotation.set(0, 0, 0);
        credibilityColor(point.credibilityScore, scratch.color);
        beams.setColorAt(i, scratch.color);
      }
      beams.instanceMatrix.needsUpdate = true;
      if (beams.instanceColor) beams.instanceColor.needsUpdate = true;
    }
  }, [points, capacity, scratch]);

  const meshArgs: ThreeElements['instancedMesh']['args'] = [undefined, undefined, capacity];

  return (
    <>
      <instancedMesh
        key={`b${capacity}`}
        ref={beamRef}
        args={meshArgs}
        frustumCulled={false}
        raycast={() => null}
      >
        <cylinderGeometry args={[0.003, 0.003, 1, 6, 1, true]} />
        <meshBasicMaterial
          toneMapped={false}
          transparent
          opacity={0.6}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh
        key={`m${capacity}`}
        ref={meshRef}
        args={meshArgs}
        frustumCulled={false}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined && e.instanceId < points.length && onHover) {
            const id = points[e.instanceId].id;
            if (lastHoveredRef.current !== id) {
              lastHoveredRef.current = id;
              onHover(id);
            }
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
          if (lastHoveredRef.current !== null) {
            lastHoveredRef.current = null;
            onHover?.(null);
          }
        }}
      >
        <octahedronGeometry args={[markerSize, 0]} />
        <meshBasicMaterial toneMapped={false} color="#ffffff" />
      </instancedMesh>
    </>
  );
}

export default DataPoints;
