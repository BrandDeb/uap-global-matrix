'use client';

/**
 * src/components/map/GlobeOverlay.tsx
 * ---------------------------------------------------------------------------
 * Canvas wrapper for the tactical globe: tactical lighting, a starfield, orbit
 * controls, and a Suspense boundary for the streamed Earth textures.
 *
 * `meshStandardMaterial` on the globe needs real lights — a key directional
 * "sun", low ambient fill, and a cool indigo rim light for the dark-mode look.
 * ---------------------------------------------------------------------------
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import TacticalGlobe from './TacticalGlobe';
import type { MapSighting } from './DataPoints';

interface GlobeOverlayProps {
  readonly points: readonly MapSighting[];
  readonly activeCount: number;
}

export default function GlobeOverlay({ points, activeCount }: GlobeOverlayProps) {
  return (
    <div className="relative h-full w-full bg-zinc-950">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#09090b']} />

        {/* Tactical lighting */}
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 3, 5]} intensity={1.6} color="#ffffff" />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color="#4338ca" />

        <Stars radius={120} depth={60} count={3500} factor={4} fade speed={0.5} />

        <Suspense fallback={null}>
          <TacticalGlobe points={points} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={2.6}
          maxDistance={10}
          zoomSpeed={0.6}
          rotateSpeed={0.5}
        />
      </Canvas>

      {/* Status overlay */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 font-mono text-[10px] tracking-widest text-zinc-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        SPATIAL TRACKING ACTIVE · WGS84 · {activeCount} ACTIVE
      </div>
    </div>
  );
}
