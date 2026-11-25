'use client';

/**
 * src/components/archive/CraftViews.tsx
 * ---------------------------------------------------------------------------
 * Live 3D craft on the archive cards, all rendered by ONE WebGL canvas:
 * each card hosts a drei <View> (a tracked viewport), and <CraftStage/>
 * holds the single fixed Canvas with <View.Port/>. Cards mount their View
 * only while on screen, so 59 cards never mean 59 render passes.
 *
 * The models are the same procedural craft the rest of the site uses,
 * picked from the case's reported morphology.
 * ---------------------------------------------------------------------------
 */

import { useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, View } from '@react-three/drei';
import type { Group } from 'three';
import { Saucer, TicTac, Triangle } from '@/components/map/AlienFleet';
import { Cigar, EggCraft, FooFighters, PlasmaOrb } from '@/components/map/CraftTypes';
import { TimeDriver } from '@/components/map/sharedTime';
import type { Morphology } from '@/lib/archive';

const MODELS: Record<Morphology, { node: ReactNode; scale: number }> = {
  DISC: { node: <Saucer phase={0} />, scale: 6 },
  SPHERE: { node: <PlasmaOrb color="#5effd8" />, scale: 11 },
  TRIANGLE: { node: <Triangle />, scale: 8 },
  TIC_TAC: { node: <TicTac />, scale: 13 },
  CIGAR: { node: <Cigar />, scale: 6 },
  OVAL: { node: <EggCraft />, scale: 12 },
  UNKNOWN: { node: <FooFighters count={7} />, scale: 7 },
};

function Spinner({ children, scale }: { children: ReactNode; scale: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.rotation.y = t * 0.8;
    g.rotation.z = Math.sin(t * 1.2) * 0.12;
    g.position.y = 0.1 + Math.sin(t * 1.6) * 0.05;
  });
  return (
    <group ref={ref} scale={scale} rotation={[0.35, 0, 0]}>
      {children}
    </group>
  );
}

/** A card's 3D viewport. Render it only while the card is visible. */
export function CraftView({ morphology, className }: { morphology: Morphology; className?: string }) {
  const m = MODELS[morphology] ?? MODELS.UNKNOWN;
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 0.15, 4]} fov={34} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <pointLight position={[-3, -1, 2]} intensity={12} color="#a58bff" />
      <Spinner scale={m.scale}>{m.node}</Spinner>
    </View>
  );
}

/** The single fixed canvas every CraftView draws into. */
export function CraftStage() {
  return (
    <Canvas
      className="!pointer-events-none !fixed !inset-0"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <TimeDriver />
      <View.Port />
    </Canvas>
  );
}
