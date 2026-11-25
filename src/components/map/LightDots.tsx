'use client';

/**
 * src/components/map/LightDots.tsx
 * Many small glowing bulbs (rim lights, portholes, wing lights) as ONE
 * InstancedMesh — one draw call per craft instead of one per bulb.
 */

import { useLayoutEffect, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';

const dummy = new Object3D();
const tmpColor = new Color();

export interface Dot {
  readonly position: readonly [number, number, number];
  readonly color: string;
}

export default function LightDots({ dots, radius, detail = 8 }: { dots: readonly Dot[]; radius: number; detail?: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    dots.forEach((d, i) => {
      dummy.position.set(d.position[0], d.position[1], d.position[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tmpColor.set(d.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dots]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, dots.length]} key={dots.length} raycast={() => null}>
      <sphereGeometry args={[radius, detail, detail]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Evenly spaced dots on a horizontal circle. */
export function circleDots(
  n: number,
  r: number,
  y: number,
  color: (i: number) => string,
): Dot[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { position: [Math.cos(a) * r, y, Math.sin(a) * r] as const, color: color(i) };
  });
}
