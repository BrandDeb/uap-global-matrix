'use client';

/**
 * src/components/landing/LandingScene.tsx
 * ---------------------------------------------------------------------------
 * The single fixed WebGL stage behind the landing page. Everything is driven
 * by `landing` (scroll + pointer), read every frame — no React re-renders.
 *
 *   Hero      a hulking saucer that lazily follows the cursor, tractor beam
 *             on, slowly abducting a very confused cow (click the saucer to
 *             hurry it along).
 *   Scroll    the saucer lifts away; ambient craft zip across the sky.
 *   Field     the field-guide showcase: the currently selected craft type,
 *   guide     big, turning on a holographic plinth.
 *   CTA       the saucer comes back down for you.
 * ---------------------------------------------------------------------------
 */

import { Suspense, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { AdditiveBlending, Color, DoubleSide, type Group, MathUtils, ShaderMaterial } from 'three';
import { easing } from 'maath';
import CosmicBackdrop from '@/components/map/CosmicBackdrop';
import { Saucer, TicTac, Triangle } from '@/components/map/AlienFleet';
import {
  BellSaucer,
  Chevron,
  Cigar,
  CubeSphere,
  Diamond,
  EggCraft,
  FooFighters,
  Jellyfish,
  PlasmaOrb,
  RingCraft,
} from '@/components/map/CraftTypes';
import { SHADER_TIME, TimeDriver } from '@/components/map/sharedTime';
import { QUALITY, initialQualityTier } from '@/components/map/quality';
import Cow from './Cow';
import VoxelAlien from './VoxelAlien';
import { xenoAudio } from './audio';
import { landing } from './landingStore';

/** Field-guide craft, in the same order as FIELD_GUIDE in Landing.tsx. */
export const SHOWCASE: ReadonlyArray<{ node: ReactNode; scale: number }> = [
  { node: <Saucer phase={0} />, scale: 11 },
  { node: <TicTac />, scale: 24 },
  { node: <Triangle />, scale: 14 },
  { node: <BellSaucer />, scale: 13 },
  { node: <Cigar />, scale: 9 },
  { node: <PlasmaOrb />, scale: 26 },
  { node: <Chevron />, scale: 14 },
  { node: <RingCraft />, scale: 16 },
  { node: <CubeSphere />, scale: 22 },
  { node: <Jellyfish />, scale: 16 },
  { node: <Diamond />, scale: 22 },
  { node: <EggCraft />, scale: 24 },
  { node: <FooFighters count={9} />, scale: 11 },
];

const smooth = (a: number, b: number, t: number) => MathUtils.smoothstep(t, a, b);

/* --- Hero saucer + cow ---------------------------------------------------- */

function HeroRig({ narrow }: { narrow: boolean }) {
  const rig = useRef<Group>(null);
  const saucer = useRef<Group>(null);
  const cow = useRef<Group>(null);
  const cowT = useRef(0);
  const boops = useRef(0);
  const [hover, setHover] = useState(false);

  useFrame(({ clock }, d) => {
    const t = clock.getElapsedTime();
    const g = rig.current;
    if (!g) return;
    // Where the rig wants to be: hero → lifted away → back for the CTA.
    const away = smooth(0, 1, landing.heroOut) * (1 - smooth(0, 1, landing.cta));
    const baseX = narrow ? 0 : landing.mouse.x * 1.4;
    const target: [number, number, number] = [
      baseX + away * (narrow ? 0 : 3.2),
      (narrow ? 1.6 : 1.2) + away * 11 + Math.sin(t * 1.1) * 0.12 + (xenoAudio?.level() ?? 0) * 0.3,
      away * -3,
    ];
    easing.damp3(g.position, target, 0.6, d);
    // Bank toward travel direction; wobble on hover.
    const bank = MathUtils.clamp((target[0] - g.position.x) * -0.35, -0.45, 0.45);
    const wobble = hover ? Math.sin(t * 18) * 0.06 : 0;
    easing.dampE(g.rotation, [0.12 + landing.mouse.y * 0.08 + wobble, 0, bank + wobble], 0.35, d);

    // Cow: rises through the beam, spins, vanishes into the hull, respawns.
    if (landing.boops !== boops.current) {
      boops.current = landing.boops;
      cowT.current = Math.max(cowT.current, 0.55);
    }
    const speed = hover ? 0.2 : 0.075;
    const prevCow = cowT.current;
    cowT.current = (cowT.current + d * speed) % 1;
    // The cow just vanished into the hull: it has opinions about this.
    if (cowT.current < prevCow && landing.heroOut < 0.3) xenoAudio?.moo();
    const c = cow.current;
    if (c) {
      const k = cowT.current;
      const s = k < 0.85 ? 0.55 : 0.55 * (1 - (k - 0.85) / 0.15);
      c.position.set(Math.sin(t * 1.7) * 0.12, -3.6 + k * 3.2, 0);
      c.scale.setScalar(Math.max(0.001, s) * (1 - landing.heroOut * 0.7));
      c.rotation.set(Math.sin(t * 1.3) * 0.6, t * 1.4, Math.cos(t * 0.9) * 0.5);
    }
    const sc = saucer.current;
    if (sc) {
      sc.rotation.y += d * (hover ? 2.5 : 0.25);
      // Shrink while it's away so its beam never trails through later sections.
      const base = narrow ? 11 : 15;
      const k = base * (1 - away * 0.6);
      easing.damp3(sc.scale, [k, k, k], 0.4, d);
    }
  });

  return (
    <group ref={rig} position={[0, 6, -2]}>
      <group
        ref={saucer}
        scale={narrow ? 11 : 15}
        onPointerOver={() => {
          setHover(true);
          document.body.dataset.cursor = 'boop';
        }}
        onPointerOut={() => {
          setHover(false);
          delete document.body.dataset.cursor;
        }}
        onClick={() => {
          landing.boops++;
          xenoAudio?.boop();
        }}
      >
        <Saucer phase={0} beamAlwaysOn />
      </group>
      <group ref={cow}>
        <Cow />
      </group>
    </group>
  );
}

/* --- Field-guide showcase ------------------------------------------------- */

const plinthFrag = /* glsl */ `
  uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
  void main(){
    vec2 p = vUv - 0.5; float r = length(p) * 2.0;
    float rings = smoothstep(0.04, 0.0, abs(fract(r * 6.0 - uTime * 0.4) - 0.5) - 0.42);
    float edge = smoothstep(1.0, 0.85, r) * smoothstep(0.0, 0.2, r);
    gl_FragColor = vec4(uColor, (rings * 0.8 + 0.08) * edge);
  }
`;
const plinthVert = /* glsl */ `
  varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

function Showcase({ narrow }: { narrow: boolean }) {
  const root = useRef<Group>(null);
  const items = useRef<Group>(null);
  const plinth = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: plinthVert,
        fragmentShader: plinthFrag,
        uniforms: { uTime: SHADER_TIME, uColor: { value: new Color('#5effd8') } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [],
  );

  useFrame(({ clock }, d) => {
    const t = clock.getElapsedTime();
    const show = landing.showcase;
    const r = root.current;
    if (r) {
      easing.damp3(r.position, [narrow ? 0 : 2.3, narrow ? 1.3 : -0.1, 0], 0.3, d);
      easing.damp3(r.scale, [show, show, show].map((v) => Math.max(0.0001, v)) as [number, number, number], 0.25, d);
      r.rotation.x = 0.25 + landing.mouse.y * 0.15;
    }
    items.current?.children.forEach((child, i) => {
      const on = i === landing.craftIndex ? 1 : 0;
      const target = Math.max(0.0001, on * (SHOWCASE[i]?.scale ?? 10));
      easing.damp3(child.scale, [target, target, target], on ? 0.25 : 0.12, d);
      child.rotation.y = t * 0.6 + landing.mouse.x * 0.8;
      child.position.y = 0.35 + Math.sin(t * 1.5 + i) * 0.08;
      child.visible = child.scale.x > 0.01;
    });
  });

  return (
    <group ref={root} scale={0.0001}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, 0]} material={plinth}>
        <circleGeometry args={[1.6, 64]} />
      </mesh>
      <group ref={items}>
        {SHOWCASE.map((s, i) => (
          <group key={i} scale={0.0001}>
            {s.node}
          </group>
        ))}
      </group>
    </group>
  );
}

/* --- Ambient fly-bys ------------------------------------------------------ */

function Flyby({ children, y, z, speed, delay }: { children: ReactNode; y: number; z: number; speed: number; delay: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = (clock.getElapsedTime() * speed + delay) % 1; // 0..1 across
    const dir = speed > 0 ? 1 : -1;
    g.position.set(dir * (-14 + t * 28), y + Math.sin(t * 12) * 0.3, z);
    g.rotation.z = Math.sin(t * 20) * 0.2;
  });
  return <group ref={ref}>{children}</group>;
}

/* --- Camera parallax ------------------------------------------------------ */

function CameraRig() {
  const { camera } = useThree();
  useFrame((_, d) => {
    easing.damp3(camera.position, [landing.mouse.x * 0.35, landing.mouse.y * 0.25, 9], 0.5, d);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ------------------------------------------------------------------------- */

export default function LandingScene({ eventSource }: { eventSource?: RefObject<HTMLElement | null> }) {
  const [tier] = useState(initialQualityTier);
  const q = QUALITY[tier];
  const [narrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 40 }}
        dpr={[1, Math.min(q.dpr, 1.75)]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        // The canvas sits behind the page; route pointer events from the page
        // root so the saucer stays clickable under the DOM layer.
        eventSource={eventSource}
        eventPrefix="client"
      >
        <color attach="background" args={['#020208']} />
        <TimeDriver />
        <CameraRig />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 6]} intensity={2.4} color="#eaf6ff" />
        <pointLight position={[-5, -2, 3]} intensity={40} color="#a58bff" />
        <pointLight position={[3, -3, 2]} intensity={25} color="#5effd8" />
        <CosmicBackdrop stars={Math.round(q.stars * 0.7)} dust={q.dust} />

        <Suspense fallback={null}>
          <HeroRig narrow={narrow} />
          <Showcase narrow={narrow} />
          <VoxelAlien narrow={narrow} />
          <Flyby y={2.8} z={-6} speed={0.09} delay={0.2}>
            <group scale={8}>
              <TicTac />
            </group>
          </Flyby>
          <Flyby y={-2.4} z={-9} speed={-0.05} delay={0.6}>
            <group scale={10}>
              <Triangle />
            </group>
          </Flyby>
          {tier > 0 && (
            <Flyby y={-0.6} z={-14} speed={0.035} delay={0.1}>
              <group scale={14}>
                <Cigar />
              </group>
            </Flyby>
          )}
        </Suspense>

        <EffectComposer multisampling={0}>
          <Bloom intensity={1.15} luminanceThreshold={0.3} luminanceSmoothing={0.35} mipmapBlur radius={0.7} />
          <Vignette eskil={false} offset={0.22} darkness={0.9} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
