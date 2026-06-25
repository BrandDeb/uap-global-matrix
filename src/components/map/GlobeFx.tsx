'use client';

/**
 * src/components/map/GlobeFx.tsx
 * ---------------------------------------------------------------------------
 * Geo-anchored globe effects: expanding "radar ping" rings at hotspot cluster
 * centers, a live ping on the newest sighting, and a highlight ring on the
 * focused (selected) sighting. Rendered as a child of the rotating Earth so the
 * rings stay locked to their coordinates.
 * ---------------------------------------------------------------------------
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  DoubleSide,
  type Mesh,
  type MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '@/lib/geo';

const RING_NORMAL = new Vector3(0, 0, 1); // ringGeometry faces +Z

interface PulseRingProps {
  readonly latitude: number;
  readonly longitude: number;
  readonly color: string;
  readonly speed?: number; // pings per second
  readonly grow?: number; // additional scale at the end of a ping
  readonly inner?: number;
  readonly outer?: number;
  readonly phaseOffset?: number;
}

function PulseRing({
  latitude,
  longitude,
  color,
  speed = 0.6,
  grow = 0.6,
  inner = 0.03,
  outer = 0.05,
  phaseOffset = 0,
}: PulseRingProps) {
  const ref = useRef<Mesh>(null);

  const { position, quaternion } = useMemo(() => {
    const pos = latLngToVector3(latitude, longitude, GLOBE_RADIUS * 1.01, new Vector3());
    const quat = new Quaternion().setFromUnitVectors(RING_NORMAL, pos.clone().normalize());
    return {
      position: [pos.x, pos.y, pos.z] as [number, number, number],
      quaternion: [quat.x, quat.y, quat.z, quat.w] as [number, number, number, number],
    };
  }, [latitude, longitude]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const phase = (clock.getElapsedTime() * speed + phaseOffset) % 1;
    mesh.scale.setScalar(0.4 + phase * grow);
    (mesh.material as MeshBasicMaterial).opacity = (1 - phase) * 0.85;
  });

  return (
    <mesh ref={ref} position={position} quaternion={quaternion}>
      <ringGeometry args={[inner, outer, 48]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        side={DoubleSide}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export interface GlobeFxHotspot {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly severityLevel: string;
}

interface GlobeFxProps {
  readonly hotspots: readonly GlobeFxHotspot[];
  readonly pingPoint?: { latitude: number; longitude: number } | null;
  readonly focusPoint?: { latitude: number; longitude: number } | null;
}

const valid = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

export default function GlobeFx({ hotspots, pingPoint, focusPoint }: GlobeFxProps) {
  return (
    <group>
      {hotspots
        .filter((h) => valid(h.latitude, h.longitude))
        .map((h) => (
          <PulseRing
            key={h.id}
            latitude={h.latitude}
            longitude={h.longitude}
            color={h.severityLevel === 'CRITICAL_FLAP' ? '#ef4444' : '#f59e0b'}
            speed={0.5}
            grow={0.7}
            inner={0.035}
            outer={0.06}
          />
        ))}

      {pingPoint && valid(pingPoint.latitude, pingPoint.longitude) && (
        <PulseRing
          latitude={pingPoint.latitude}
          longitude={pingPoint.longitude}
          color="#22d3ee"
          speed={1.1}
          grow={0.4}
          inner={0.02}
          outer={0.035}
        />
      )}

      {focusPoint && valid(focusPoint.latitude, focusPoint.longitude) && (
        <PulseRing
          latitude={focusPoint.latitude}
          longitude={focusPoint.longitude}
          color="#34d399"
          speed={0.9}
          grow={0.3}
          inner={0.03}
          outer={0.05}
        />
      )}
    </group>
  );
}
