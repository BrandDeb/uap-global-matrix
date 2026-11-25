'use client';

/**
 * src/components/landing/Cow.tsx
 * An original low-poly cartoon cow built from primitives — the unwilling
 * star of the landing-page abduction. Legs flail while it's being beamed up.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

const WHITE = '#f4f1ea';
const BLACK = '#17151c';
const PINK = '#ff9cc2';

export default function Cow({ flail = 1 }: { flail?: number }) {
  const legs = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const head = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    legs.current?.children.forEach((leg, i) => {
      leg.rotation.x = Math.sin(t * 9 + i * 1.7) * 0.6 * flail;
      leg.rotation.z = Math.cos(t * 7 + i) * 0.25 * flail;
    });
    if (tail.current) tail.current.rotation.z = Math.sin(t * 6) * 0.8;
    if (head.current) head.current.rotation.z = Math.sin(t * 2.3) * 0.25;
  });

  return (
    <group>
      {/* body */}
      <mesh scale={[1, 0.62, 0.62]}>
        <capsuleGeometry args={[0.5, 0.7, 6, 16]} />
        <meshStandardMaterial color={WHITE} roughness={0.8} />
      </mesh>
      {/* spots */}
      {(
        [
          [0.25, 0.25, 0.28, 0.22],
          [-0.35, 0.15, 0.3, 0.18],
          [0.05, -0.05, -0.33, 0.2],
          [-0.2, 0.3, -0.2, 0.15],
        ] as const
      ).map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} scale={[1, 0.6, 0.35]}>
          <sphereGeometry args={[r, 12, 12]} />
          <meshStandardMaterial color={BLACK} roughness={0.7} />
        </mesh>
      ))}
      {/* head */}
      <group ref={head} position={[0.82, 0.22, 0]}>
        <mesh scale={[0.9, 0.85, 0.8]}>
          <boxGeometry args={[0.45, 0.42, 0.4]} />
          <meshStandardMaterial color={WHITE} roughness={0.8} />
        </mesh>
        <mesh position={[0.22, -0.08, 0]}>
          <boxGeometry args={[0.16, 0.22, 0.38]} />
          <meshStandardMaterial color={PINK} roughness={0.6} />
        </mesh>
        {/* googly eyes */}
        {[-1, 1].map((s) => (
          <group key={s} position={[0.16, 0.1, s * 0.14]}>
            <mesh>
              <sphereGeometry args={[0.075, 14, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <mesh position={[0.05, -0.015, 0]}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshBasicMaterial color={BLACK} />
            </mesh>
          </group>
        ))}
        {/* horns + ears */}
        {[-1, 1].map((s) => (
          <group key={`h${s}`}>
            <mesh position={[-0.02, 0.26, s * 0.13]} rotation={[s * 0.4, 0, 0]}>
              <coneGeometry args={[0.035, 0.14, 8]} />
              <meshStandardMaterial color="#e9d6a7" />
            </mesh>
            <mesh position={[-0.05, 0.12, s * 0.26]} rotation={[s * 0.9, 0, 0]} scale={[0.5, 1, 0.25]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial color={PINK} />
            </mesh>
          </group>
        ))}
      </group>
      {/* legs */}
      <group ref={legs}>
        {(
          [
            [0.4, 0.2],
            [0.4, -0.2],
            [-0.4, 0.2],
            [-0.4, -0.2],
          ] as const
        ).map(([x, z]) => (
          <group key={`${x},${z}`} position={[x, -0.25, z]}>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.07, 0.06, 0.4, 8]} />
              <meshStandardMaterial color={WHITE} />
            </mesh>
            <mesh position={[0, -0.42, 0]}>
              <cylinderGeometry args={[0.075, 0.075, 0.07, 8]} />
              <meshStandardMaterial color={BLACK} />
            </mesh>
          </group>
        ))}
      </group>
      {/* udder */}
      <mesh position={[-0.1, -0.33, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color={PINK} />
      </mesh>
      {/* tail */}
      <group ref={tail} position={[-0.9, 0.15, 0]}>
        <mesh position={[-0.05, -0.2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
        <mesh position={[-0.05, -0.42, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={BLACK} />
        </mesh>
      </group>
    </group>
  );
}
