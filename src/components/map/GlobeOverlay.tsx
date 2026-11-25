'use client';

/**
 * src/components/map/GlobeOverlay.tsx
 * ---------------------------------------------------------------------------
 * Full-bleed WebGL stage: nebula + starfield, shader xeno-Earth with orbital
 * halos, sighting pillars, trajectory arcs and radar rings — finished with a
 * post stack (bloom · chromatic aberration · grain · vignette) and a cinematic
 * camera fly-in on load.
 *
 * Performance: an adaptive quality tier (see ./quality) is chosen per device and
 * adjusted live by drei's <PerformanceMonitor>. Append `?fps` to the URL to show
 * a live FPS / tier readout.
 * ---------------------------------------------------------------------------
 */

import { Suspense, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Leva, useControls } from 'leva';
import AlienEarth from './AlienEarth';
import CosmicBackdrop from './CosmicBackdrop';
import DataPoints, { type MapSighting } from './DataPoints';
import GlobeFx, { type GlobeFxHotspot } from './GlobeFx';
import Trajectories from './Trajectories';
import { TimeDriver } from './sharedTime';
import AlienFleet from './AlienFleet';
import { QUALITY, initialQualityTier, qualityLocked, type QualityTier } from './quality';

interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

interface GlobeOverlayProps {
  readonly points: readonly MapSighting[];
  readonly activeCount: number;
  readonly hotspots?: readonly GlobeFxHotspot[];
  readonly pingPoint?: GeoPoint | null;
  readonly focusPoint?: GeoPoint | null;
  readonly onSelect?: (id: string) => void;
}

/**
 * Ease the camera in from deep space on first mount, then hand control cleanly
 * to OrbitControls so the two never fight over `camera.position` mid-flight.
 */
function IntroCamera({
  onComplete,
  controlsRef,
}: {
  onComplete: () => void;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();
  // Portrait screens need more distance for the globe to fit the width.
  const restZ = size.width / size.height < 0.8 ? 13 : 8.6;
  const t = useRef(0);
  const done = useRef(false);

  useFrame((_, d) => {
    if (done.current) return;
    const dt = Math.min(d, 0.05);
    t.current = Math.min(1, t.current + dt * 0.42);
    const e = 1 - Math.pow(1 - t.current, 3);
    camera.position.set(Math.sin((1 - e) * 0.9) * 2.4, (1 - e) * 2.8, restZ + (1 - e) * 18);
    camera.lookAt(0, 0, 0);
    if (t.current >= 1) {
      done.current = true;
      controlsRef.current?.target.set(0, 0, 0);
      controlsRef.current?.update();
      onComplete();
    }
  });
  return null;
}

const CA_OFFSET = new Vector2(0.0007, 0.0005);
const emptySubscribe = () => () => {};
const getShowFxSnapshot = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('fx') === '1' || params.get('debug') === '1';
};

const noopSubscribe = () => () => {};

/** Rolling frames-per-second sampler; reports twice a second. */
interface FpsSample {
  fps: number;
  calls: number;
  triangles: number;
}

function FpsProbe({ onSample }: { onSample: (s: FpsSample) => void }) {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame(({ gl }, d) => {
    // Count the whole frame (scene + every post pass): stop three from
    // resetting per render() call, read last frame's totals, then reset.
    gl.info.autoReset = false;
    const calls = gl.info.render.calls;
    const triangles = gl.info.render.triangles;
    gl.info.reset();
    acc.current.frames++;
    acc.current.time += d;
    if (acc.current.time >= 0.5) {
      onSample({ fps: Math.round(acc.current.frames / acc.current.time), calls, triangles });
      acc.current = { frames: 0, time: 0 };
    }
  });
  return null;
}

export default function GlobeOverlay({
  points,
  hotspots = [],
  pingPoint,
  focusPoint,
  onSelect,
}: GlobeOverlayProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Adaptive quality: start from a device guess, never climb above it.
  const [maxTier] = useState<QualityTier>(initialQualityTier);
  const [tier, setTier] = useState<QualityTier>(maxTier);
  const [locked] = useState(qualityLocked);
  const q = QUALITY[tier];
  // `?fps` in the URL → live readout. Server snapshot is false (no hydration mismatch).
  const showFps = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).has('fps'),
    () => false,
  );
  const [fps, setFps] = useState<FpsSample>({ fps: 0, calls: 0, triangles: 0 });
  const [introDone, setIntroDone] = useState(false);
  const showFxPanel = useSyncExternalStore(emptySubscribe, getShowFxSnapshot, () => false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Live-tunable post FX (panel hidden unless ?fx=1 so it never covers HUD tabs).
  const fx = useControls('Post FX', {
    bloom: { value: 1.05, min: 0, max: 4, step: 0.05 },
    threshold: { value: 0.34, min: 0, max: 1, step: 0.01 },
    radius: { value: 0.72, min: 0, max: 1, step: 0.01 },
    grain: { value: 0.22, min: 0, max: 1, step: 0.01 },
    vignette: { value: 0.8, min: 0, max: 1.5, step: 0.01 },
  });
  const hovered = hoveredId ? (points.find((p) => p.id === hoveredId) ?? null) : null;

  return (
    <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
      <Leva hidden={!showFxPanel} collapsed />
      <Canvas
        className="h-full w-full"
        camera={{ position: [2.1, 2.8, 26.6], fov: 42, near: 0.1, far: 500 }}
        dpr={[1, q.dpr]}
        gl={{
          antialias: false,
          stencil: false,
          depth: true,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#020208']} />
        {!locked && (
          <PerformanceMonitor
            // Step down below ~50 fps, back up above ~58 (60 Hz) / ~85 (high-refresh).
            bounds={(refresh) => (refresh > 90 ? [50, 85] : [50, 58])}
            flipflops={4}
            onDecline={() => setTier((t) => (t > 0 ? ((t - 1) as QualityTier) : t))}
            onIncline={() => setTier((t) => (t < maxTier ? ((t + 1) as QualityTier) : t))}
            onFallback={() => setTier(0)}
          />
        )}
        {showFps && <FpsProbe onSample={setFps} />}
        <TimeDriver />
        <IntroCamera controlsRef={controlsRef} onComplete={() => setIntroDone(true)} />
        <CosmicBackdrop key={`bg-${tier}`} stars={q.stars} dust={q.dust} />

        <Suspense fallback={null}>
          <AlienEarth focusPoint={focusPoint} segments={q.segments}>
            <group scale={1.02}>
              <DataPoints points={points} onSelect={onSelect} onHover={setHoveredId} />
            </group>
            <Trajectories points={points} />
            <GlobeFx hotspots={hotspots} pingPoint={pingPoint} focusPoint={focusPoint} />
          </AlienEarth>
          <AlienFleet maxCraft={q.craft} setPieces={q.setPieces} />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enabled={introDone}
          enablePan={false}
          minDistance={3.1}
          maxDistance={14}
          zoomSpeed={0.6}
          rotateSpeed={0.45}
          enableDamping
          dampingFactor={0.07}
        />

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={fx.bloom}
            luminanceThreshold={fx.threshold}
            luminanceSmoothing={0.4}
            mipmapBlur
            radius={fx.radius}
          />
          <>
            {q.fullPost && (
              <>
                <ChromaticAberration offset={CA_OFFSET} radialModulation modulationOffset={0.35} />
                <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={fx.grain} />
              </>
            )}
          </>
          <Vignette eskil={false} offset={0.22} darkness={fx.vignette} />
        </EffectComposer>
      </Canvas>

      {showFps && (
        <div className="pointer-events-none absolute left-4 top-36 z-30 md:top-20 rounded-lg bg-black/70 px-3 py-1.5 font-mono text-[11px] text-[var(--xeno-a)]">
          {fps.fps} FPS · {q.label.toUpperCase()} · {q.craft} craft · dpr ≤{q.dpr} · {fps.calls} draws ·{' '}
          {Math.round(fps.triangles / 1000)}k tris
        </div>
      )}

      {hovered && (
        <div className="xeno-glass pointer-events-none absolute bottom-32 left-1/2 z-20 -translate-x-1/2 px-4 py-2 font-mono text-[11px] tracking-wider text-[var(--xeno-a)]">
          <span className="mr-2 inline-block h-1.5 w-1.5 animate-ping rounded-full bg-[var(--xeno-a)]" />
          {hovered.title}
          <span className="ml-3 text-white/40">CRED {hovered.credibilityScore}%</span>
        </div>
      )}
    </div>
  );
}
