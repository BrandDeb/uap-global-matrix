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
}

export default function TacticalGlobe({ points }: TacticalGlobeProps) {
  const earthRef = useRef<Mesh>(null);

  // Tag the albedo map sRGB on load (or the night lights render washed-out);
  // the bump map stays linear — it's data, not colour. Setting it in the load
  // callback avoids mutating a hook value during render.
  const [colorMap, bumpMap] = useTexture(
    ['/textures/earth-dark.jpg', '/textures/earth-topology.png'],
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
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.04}
          roughness={0.85}
          metalness={0.1}
        />
        {/* Lift markers a hair above the surface so the texture can't occlude
            them; the group rotates with the Earth. */}
        <group scale={1.02}>
          <DataPoints points={points} />
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
