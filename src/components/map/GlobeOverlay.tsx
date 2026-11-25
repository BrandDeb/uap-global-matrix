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

/** Ease the camera in from deep space on first mount. */
function IntroCamera() {
  const { camera } = useThree();
  const t = useRef(0);
  useFrame((_, d) => {
    if (t.current >= 1) return;
    t.current = Math.min(1, t.current + d * 0.35);
    const e = 1 - Math.pow(1 - t.current, 4);
    camera.position.set(Math.sin((1 - e) * 1.2) * 3, (1 - e) * 4, 8.6 + (1 - e) * 40);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

const CA_OFFSET = new Vector2(0.0009, 0.0006);

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
  // Live-tunable post FX (panel only shown in development).
  const fx = useControls('Post FX', {
    bloom: { value: 1.1, min: 0, max: 4, step: 0.05 },
    threshold: { value: 0.32, min: 0, max: 1, step: 0.01 },
    radius: { value: 0.75, min: 0, max: 1, step: 0.01 },
    grain: { value: 0.35, min: 0, max: 1, step: 0.01 },
    vignette: { value: 0.85, min: 0, max: 1.5, step: 0.01 },
  });
  const hovered = hoveredId ? (points.find((p) => p.id === hoveredId) ?? null) : null;

  return (
    <div className="absolute inset-0">
      <Leva hidden={process.env.NODE_ENV === 'production'} collapsed />
      <Canvas
        camera={{ position: [0, 4, 46], fov: 42, near: 0.1, far: 500 }}
        dpr={[1, q.dpr]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
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
        <IntroCamera />
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
          enablePan={false}
          minDistance={2.8}
          maxDistance={14}
          zoomSpeed={0.6}
          rotateSpeed={0.45}
          enableDamping
          dampingFactor={0.06}
        />

        <EffectComposer multisampling={0}>
          <Bloom intensity={fx.bloom} luminanceThreshold={fx.threshold} luminanceSmoothing={0.4} mipmapBlur radius={fx.radius} />
          <>
            {q.fullPost && (
              <>
                <ChromaticAberration offset={CA_OFFSET} radialModulation modulationOffset={0.3} />
                <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={fx.grain} />
              </>
            )}
          </>
          <Vignette eskil={false} offset={0.2} darkness={fx.vignette} />
        </EffectComposer>
      </Canvas>

      {showFps && (
        <div className="pointer-events-none absolute left-4 top-20 z-30 rounded-lg bg-black/70 px-3 py-1.5 font-mono text-[11px] text-[var(--xeno-a)]">
          {fps.fps} FPS · {q.label.toUpperCase()} · {q.craft} craft · dpr ≤{q.dpr} · {fps.calls} draws ·{' '}
          {Math.round(fps.triangles / 1000)}k tris
        </div>
      )}

      {hovered && (
        <div className="xeno-glass pointer-events-none absolute bottom-40 left-1/2 -translate-x-1/2 px-4 py-2 font-mono text-[11px] tracking-wider text-[var(--xeno-a)]">
          <span className="mr-2 inline-block h-1.5 w-1.5 animate-ping rounded-full bg-[var(--xeno-a)]" />
          {hovered.title}
          <span className="ml-3 text-white/40">CRED {hovered.credibilityScore}%</span>
        </div>
      )}
    </div>
  );
}
