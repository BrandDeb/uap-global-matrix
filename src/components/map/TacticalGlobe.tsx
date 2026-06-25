'use client';

/**
 * src/components/map/TacticalGlobe.tsx
 * ---------------------------------------------------------------------------
 * Night-Earth textured globe.
 *
 *   - equirectangular dark albedo map (`earth-dark.jpg`) + topology bump map
 *   - additive back-side shell for a cheap atmospheric rim ("fake fresnel")
 *   - the sighting markers are parented to the Earth mesh, so they rotate WITH
 *     the continents and stay locked to their coordinates
 *
 * Lighting + the Canvas live in `GlobeOverlay`; this is scene content only.
 * ---------------------------------------------------------------------------
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { AdditiveBlending, BackSide, SRGBColorSpace, type Mesh } from 'three';
import DataPoints, { type MapSighting } from './DataPoints';
import { GLOBE_RADIUS } from '@/lib/geo';

interface TacticalGlobeProps {
  readonly points: readonly MapSighting[];
  readonly onSelect?: (id: string) => void;
}

export default function TacticalGlobe({ points, onSelect }: TacticalGlobeProps) {
  const earthRef = useRef<Mesh>(null);

  // Night-lights albedo (visible continents + glowing cities) + topology bump.
  // Tag the colour map sRGB on load; the bump map stays linear (it's data, not
  // colour). Done in the load callback to avoid mutating a hook value in render.
  const [nightMap, bumpMap] = useTexture(
    ['/textures/earth-night.jpg', '/textures/earth-topology.png'],
    (loaded) => {
      const albedo = Array.isArray(loaded) ? loaded[0] : loaded;
      if (albedo) albedo.colorSpace = SRGBColorSpace;
    },
  );

  // Passive intelligence-hub spin. DataPoints is a child of this mesh, so the
  // markers rotate together and never drift off their coordinates.
  useFrame(({ clock }) => {
    if (earthRef.current) {
      earthRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <group>
      {/* Core Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={nightMap}
          // Self-illuminate the night lights so geography is visible from every
          // angle, not just the lit hemisphere (a near-black albedo lit by a
          // single light was rendering as a black ball).
          emissive="#ffffff"
          emissiveMap={nightMap}
          emissiveIntensity={0.9}
          bumpMap={bumpMap}
          bumpScale={0.03}
          roughness={1}
          metalness={0}
        />
        {/* Lift markers a hair above the surface so the texture can't occlude
            them; the group rotates with the Earth. */}
        <group scale={1.02}>
          <DataPoints points={points} onSelect={onSelect} />
        </group>
      </mesh>

      {/* Atmospheric rim — unlit additive back-side shell. */}
      <mesh scale={1.025}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#1e40af"
          transparent
          opacity={0.18}
          side={BackSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
