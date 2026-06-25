'use client';

/**
 * src/components/map/TacticalGlobe.tsx
 * ---------------------------------------------------------------------------
 * Night-Earth textured globe + geo-anchored effects (GlobeFx).
 *
 *   - equirectangular night-lights albedo (emissive) + topology bump
 *   - markers + effect rings parented to the Earth, so they rotate WITH it
 *   - idle: slow quaternion spin. On `focusPoint` (a selected sighting): the
 *     globe smoothly orients so that point faces the camera and holds.
 *
 * Lighting + the Canvas live in `GlobeOverlay`.
 * ---------------------------------------------------------------------------
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  AdditiveBlending,
  BackSide,
  type Mesh,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import DataPoints, { type MapSighting } from './DataPoints';
import GlobeFx, { type GlobeFxHotspot } from './GlobeFx';
import { GLOBE_RADIUS, latLngToVector3 } from '@/lib/geo';

interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

interface TacticalGlobeProps {
  readonly points: readonly MapSighting[];
  readonly hotspots: readonly GlobeFxHotspot[];
  readonly pingPoint?: GeoPoint | null;
  readonly focusPoint?: GeoPoint | null;
  readonly onSelect?: (id: string) => void;
  readonly onHover?: (id: string | null) => void;
}

// Scratch reused across frames (single globe instance in the scene).
const Y_AXIS = new Vector3(0, 1, 0);
const CAMERA_DIR = new Vector3(0, 0, 1);
const tmpDir = new Vector3();
const tmpQuat = new Quaternion();

export default function TacticalGlobe({
  points,
  hotspots,
  pingPoint,
  focusPoint,
  onSelect,
  onHover,
}: TacticalGlobeProps) {
  const earthRef = useRef<Mesh>(null);
  const spinRef = useRef(0);

  const [nightMap, bumpMap] = useTexture(
    ['/textures/earth-night.jpg', '/textures/earth-topology.png'],
    (loaded) => {
      const albedo = Array.isArray(loaded) ? loaded[0] : loaded;
      if (albedo) albedo.colorSpace = SRGBColorSpace;
    },
  );

  useFrame((_, delta) => {
    const mesh = earthRef.current;
    if (!mesh) return;
    spinRef.current += delta * 0.12; // idle spin advances even while focused
    if (focusPoint) {
      // Orient so the focused coordinate faces the camera (+Z), then hold.
      latLngToVector3(focusPoint.latitude, focusPoint.longitude, 1, tmpDir).normalize();
      tmpQuat.setFromUnitVectors(tmpDir, CAMERA_DIR);
      mesh.quaternion.slerp(tmpQuat, Math.min(1, delta * 2.5));
    } else {
      tmpQuat.setFromAxisAngle(Y_AXIS, spinRef.current);
      mesh.quaternion.slerp(tmpQuat, Math.min(1, delta * 2));
    }
  });

  return (
    <group>
      {/* Core Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={nightMap}
          emissive="#ffffff"
          emissiveMap={nightMap}
          emissiveIntensity={0.9}
          bumpMap={bumpMap}
          bumpScale={0.03}
          roughness={1}
          metalness={0}
        />
        {/* Markers lifted just above the surface; rotate/orient with the Earth. */}
        <group scale={1.02}>
          <DataPoints points={points} onSelect={onSelect} onHover={onHover} />
        </group>
        <GlobeFx hotspots={hotspots} pingPoint={pingPoint} focusPoint={focusPoint} />
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
