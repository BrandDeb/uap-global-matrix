'use client';

/**
 * src/components/map/AlienFleet.tsx
 * ---------------------------------------------------------------------------
 * Procedural craft traffic around the planet — all geometry is built from
 * primitives (no external models):
 *
 *   - Saucer: lathed metallic hull, spinning rim lights, glass canopy with a
 *     piloting alien (blinks, looks around), pulsing tractor beam that fires
 *     toward the planet on a cycle.
 *   - Tic-tac: glowing capsule with erratic UAP-style "instant" repositioning.
 *   - Triangle: black delta with three corner lights and a red core.
 *   - Mothership: huge slow silhouette crossing the deep background.
 *   - Hero alien: a large pilot floating beside the globe, waving.
 *   - Plus the wider catalogue in ./CraftTypes: bell saucers, cigars, plasma
 *     orbs, chevrons, diamonds, ring craft, cube-in-sphere, jellyfish, eggs
 *     and foo-fighter swarms.
 *
 * Every craft rides a tilted orbit; banking comes from the orbit tangent.
 * ---------------------------------------------------------------------------
 */

import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type Group,
  LatheGeometry,
  Matrix4,
  type Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { easing } from 'maath';
import { SHADER_TIME } from './sharedTime';
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
} from './CraftTypes';

/* -------------------------------------------------------------------------- */
/* Alien                                                                      */
/* -------------------------------------------------------------------------- */

// Head profile (radius by height) lathed into the classic inverted-pear skull.
const HEAD_PROFILE = [
  [0, -0.62],
  [0.12, -0.6],
  [0.22, -0.48],
  [0.34, -0.22],
  [0.46, 0.05],
  [0.55, 0.3],
  [0.56, 0.5],
  [0.48, 0.7],
  [0.3, 0.84],
  [0, 0.88],
].map(([x, y]) => new Vector2(x, y));

const BODY_PROFILE = [
  [0, -0.7],
  [0.18, -0.68],
  [0.22, -0.3],
  [0.2, 0.1],
  [0.12, 0.3],
  [0.06, 0.42],
  [0, 0.44],
].map(([x, y]) => new Vector2(x, y));

const skinVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    vP = position;
    vec4 wp = modelMatrix * vec4(position,1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const skinFrag = /* glsl */ `
  uniform float uTime; uniform vec3 uSkin; uniform vec3 uGlow;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    float diff = max(dot(vN, normalize(vec3(0.4,0.8,0.6))), 0.0);
    float fres = pow(1.0 - max(dot(vN, vV), 0.0), 2.5);
    // bioluminescent veins crawling over the skin
    float veins = smoothstep(0.97, 1.0, sin(vP.y * 14.0 + sin(vP.x * 18.0) * 2.0 + uTime * 1.5));
    vec3 col = uSkin * (0.25 + diff * 0.75) + uGlow * fres * 1.4 + uGlow * veins * 0.25;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function useSkin(skin: string, glow: string) {
  return useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skinVert,
        fragmentShader: skinFrag,
        uniforms: { uTime: SHADER_TIME, uSkin: { value: new Color(skin) }, uGlow: { value: new Color(glow) } },
      }),
    [skin, glow],
  );
}

export function Alien({
  skin = '#8fe3b0',
  glow = '#5effd8',
  wave = false,
  seed = 0,
}: {
  skin?: string;
  glow?: string;
  wave?: boolean;
  /** Time offset so multiple aliens don't blink in sync. */
  seed?: number;
}) {
  const skinMat = useSkin(skin, glow);
  const head = useMemo(() => new LatheGeometry(HEAD_PROFILE, 48), []);
  const body = useMemo(() => new LatheGeometry(BODY_PROFILE, 32), []);
  const headRef = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const arm = useRef<Group>(null);

  useFrame(({ clock }, d) => {
    const t = clock.getElapsedTime() + seed;
    // Blink: a quick eyelid squash every ~4s.
    const blink = (t % 4) < 0.12 ? 0.1 : 1;
    if (eyes.current) eyes.current.scale.y = blink;
    // Curious head motion.
    if (headRef.current) {
      easing.dampE(
        headRef.current.rotation,
        [Math.sin(t * 0.7) * 0.15, Math.sin(t * 0.45) * 0.6, Math.sin(t * 0.9) * 0.08],
        0.4,
        d,
      );
    }
    if (arm.current) arm.current.rotation.z = wave ? 2.3 + Math.sin(t * 6) * 0.35 : 0.25;
  });

  return (
    <group>
      {/* Body */}
      <mesh geometry={body} material={skinMat} position={[0, -0.95, 0]} />
      {/* Arms */}
      <group position={[-0.17, -0.65, 0]} rotation={[0, 0, -0.25]}>
        <mesh material={skinMat} position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.035, 0.5, 4, 8]} />
        </mesh>
      </group>
      <group ref={arm} position={[0.17, -0.65, 0]}>
        <mesh material={skinMat} position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.035, 0.5, 4, 8]} />
        </mesh>
        {/* three long fingers */}
        {[-0.4, 0, 0.4].map((r) => (
          <mesh key={r} material={skinMat} position={[Math.sin(r) * 0.04, -0.6, 0]} rotation={[0, 0, r]}>
            <capsuleGeometry args={[0.012, 0.12, 3, 6]} />
          </mesh>
        ))}
      </group>
      {/* Head */}
      <group ref={headRef}>
        <mesh geometry={head} material={skinMat} />
        <group ref={eyes} position={[0, 0.12, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.24, 0, 0.36]} rotation={[0, s * 0.45, s * -0.5]}>
              <mesh scale={[0.13, 0.24, 0.1]}>
                <sphereGeometry args={[1, 24, 24]} />
                <meshPhysicalMaterial color="#020205" roughness={0.05} metalness={0.2} clearcoat={1} />
              </mesh>
              {/* specular glint so the eyes read as glossy in any light */}
              <mesh position={[0.03, 0.08, 0.09]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshBasicMaterial color="#cffff3" toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
        {/* tiny nostrils + mouth slit */}
        <mesh position={[0, -0.22, 0.44]} scale={[0.07, 0.008, 0.02]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#0b2a1c" />
        </mesh>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Orbit rig                                                                  */
/* -------------------------------------------------------------------------- */

interface OrbitProps {
  readonly radius: number;
  readonly speed: number;
  readonly incline: [number, number, number];
  readonly phase?: number;
  readonly bob?: number;
  /** UAP-style: hold, then snap ahead along the orbit. */
  readonly jumpy?: boolean;
  readonly children: ReactNode;
}

const tmpUp = new Vector3();
const tmpFwd = new Vector3();
const tmpRight = new Vector3();
const tmpM = new Matrix4();

function Orbit({ radius, speed, incline, phase = 0, bob = 0.08, jumpy = false, children }: OrbitProps) {
  const craft = useRef<Group>(null);
  const angle = useRef(phase);

  useFrame(({ clock }, d) => {
    const g = craft.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    if (jumpy) {
      // 2.6s cycle: drift slowly, then a near-instant jump.
      const c = (t + phase * 3) % 2.6;
      angle.current += d * speed * (c > 2.45 ? 22 : 0.25);
    } else {
      angle.current += d * speed;
    }
    const a = angle.current;
    const y = Math.sin(t * 1.3 + phase) * bob;
    g.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    // Local basis: up = away from planet, forward = direction of travel.
    tmpUp.copy(g.position).normalize();
    tmpFwd.set(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(Math.sign(speed) || 1);
    tmpRight.crossVectors(tmpUp, tmpFwd).normalize();
    tmpFwd.crossVectors(tmpRight, tmpUp);
    tmpM.makeBasis(tmpRight, tmpUp, tmpFwd);
    g.quaternion.setFromRotationMatrix(tmpM);
    g.rotateZ(0.2 * Math.sign(speed)); // bank into the turn
  });

  return (
    <group rotation={incline}>
      <group ref={craft}>{children}</group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Craft                                                                      */
/* -------------------------------------------------------------------------- */

const beamVert = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const beamFrag = /* glsl */ `
  uniform float uTime; uniform vec3 uColor; uniform float uPhase;
  varying vec2 vUv;
  void main(){
    float on = smoothstep(0.0, 0.15, sin(uTime * 0.5 + uPhase));
    float rings = 0.5 + 0.5 * sin(vUv.y * 40.0 + uTime * 8.0);
    float fade = pow(vUv.y, 1.5);
    float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
    gl_FragColor = vec4(uColor * (1.0 + rings), fade * (0.25 + rings * 0.35) * on * (0.4 + edge * 0.6));
  }
`;

const HULL = [
  [0, -0.1],
  [0.35, -0.12],
  [0.85, -0.05],
  [1.0, 0],
  [0.85, 0.06],
  [0.45, 0.14],
  [0, 0.16],
].map(([x, y]) => new Vector2(x, y));

function Saucer({ color = '#5effd8', phase = 0, pilot = true }: { color?: string; phase?: number; pilot?: boolean }) {
  const hull = useMemo(() => new LatheGeometry(HULL, 64), []);
  const beam = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: beamVert,
        fragmentShader: beamFrag,
        uniforms: { uTime: SHADER_TIME, uColor: { value: new Color(color) }, uPhase: { value: phase } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [color, phase],
  );
  const rim = useRef<Group>(null);
  useFrame((_, d) => {
    if (rim.current) rim.current.rotation.y += d * 2.2;
  });

  return (
    // Craft space: +Z forward. Saucer disc lies in XZ; belly (-Y) faces planet
    // after Orbit banks it, so the beam points down -Y.
    <group scale={0.11}>
      <mesh geometry={hull}>
        <meshStandardMaterial color="#9aa3b8" metalness={0.95} roughness={0.22} />
      </mesh>
      {/* underside glow ring */}
      <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.36, 48]} />
        <meshBasicMaterial color={color} toneMapped={false} side={DoubleSide} />
      </mesh>
      {/* rotating rim lights */}
      <group ref={rim}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.93, 0.01, Math.sin(a) * 0.93]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshBasicMaterial color={i % 2 ? color : '#ffffff'} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {/* canopy + pilot */}
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={color}
          transmission={0.9}
          thickness={0.2}
          roughness={0.05}
          transparent
          opacity={0.35}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      {pilot && (
        <group position={[0, 0.3, 0]} scale={0.2}>
          <Alien seed={phase * 7.3} />
        </group>
      )}
      {/* tractor beam */}
      <mesh position={[0, -1.6, 0]} material={beam}>
        <cylinderGeometry args={[0.18, 0.9, 3, 32, 1, true]} />
      </mesh>
    </group>
  );
}

function TicTac() {
  return (
    <group scale={0.05} rotation={[0, 0, Math.PI / 2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.35, 1.2, 8, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#dff9ff" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Triangle() {
  return (
    <group scale={0.13}>
      <mesh scale={[1, 0.12, 1]} rotation={[0, Math.PI / 6, 0]}>
        <coneGeometry args={[1, 1, 3]} />
        <meshStandardMaterial color="#0a0a12" metalness={0.8} roughness={0.35} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.82, -0.08, Math.sin(a) * 0.82]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color="#fff6dc" toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color="#ff2d55" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Mothership() {
  const ref = useRef<Group>(null);
  const hull = useMemo(() => new LatheGeometry(HULL, 96), []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    // 90s pass across the far background, right to left.
    const t = (clock.getElapsedTime() % 90) / 90;
    g.position.set(60 - t * 120, 14 + Math.sin(t * Math.PI) * 4, -70);
    g.rotation.y += 0.002;
  });
  return (
    <group ref={ref} scale={9} rotation={[0.18, 0, 0]}>
      <mesh geometry={hull}>
        <meshStandardMaterial color="#1a1c2a" metalness={0.9} roughness={0.4} />
      </mesh>
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.95, -0.03, Math.sin(a) * 0.95]}>
            <sphereGeometry args={[0.018, 6, 6]} />
            <meshBasicMaterial color={i % 3 ? '#a58bff' : '#5effd8'} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 48]} />
        <meshBasicMaterial color="#5effd8" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Large pilot hovering beside the planet, waving at the viewer. */
function HeroAlien() {
  const ref = useRef<Group>(null);
  const halo = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.position.y = 1.1 + Math.sin(t * 0.9) * 0.12;
      ref.current.rotation.y = 0.5 + Math.sin(t * 0.3) * 0.15;
    }
    if (halo.current) halo.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
  });
  return (
    <group ref={ref} position={[-3.5, 1.1, -0.6]} scale={0.5}>
      <Alien wave skin="#9ef0c0" glow="#a58bff" />
      <mesh ref={halo} position={[0, 0.2, -0.3]}>
        <ringGeometry args={[0.9, 0.93, 64]} />
        <meshBasicMaterial color="#a58bff" toneMapped={false} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

export default function AlienFleet() {
  return (
    <group>
      {/* Lights for the PBR craft (the planet itself is fully shader-lit). */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 4, 6]} intensity={2.2} color="#e8f4ff" />
      <pointLight position={[-6, -2, -4]} intensity={30} color="#a58bff" />

      {/* Saucers — the classics, in several liveries */}
      <Orbit radius={2.75} speed={0.35} incline={[0.35, 0, 0.2]} phase={0}>
        <Saucer phase={0} />
      </Orbit>
      <Orbit radius={3.1} speed={-0.25} incline={[-0.5, 0.4, -0.3]} phase={2.2}>
        <Saucer color="#a58bff" phase={2} />
      </Orbit>
      <Orbit radius={3.55} speed={0.2} incline={[0.9, -0.3, 0.5]} phase={5.1}>
        <Saucer color="#ff5ec8" phase={4} />
      </Orbit>
      <Orbit radius={2.9} speed={-0.42} incline={[1.4, 0.2, -0.6]} phase={0.8} bob={0.04}>
        <Saucer color="#ffd36b" phase={1} pilot={false} />
      </Orbit>
      <Orbit radius={3.25} speed={0.3} incline={[-1.2, -0.5, 0.3]} phase={3.3}>
        <BellSaucer />
      </Orbit>
      <Orbit radius={2.55} speed={-0.36} incline={[0.6, 1.1, 0.2]} phase={4.4}>
        <BellSaucer color="#5effd8" />
      </Orbit>

      {/* Tic-tacs (UAP-style instant jumps) */}
      <Orbit radius={2.45} speed={0.6} incline={[1.1, 0, 0.4]} phase={1} jumpy bob={0.02}>
        <TicTac />
      </Orbit>
      <Orbit radius={2.6} speed={-0.5} incline={[-0.9, 0.6, 0]} phase={4} jumpy bob={0.02}>
        <TicTac />
      </Orbit>

      {/* Triangles, chevrons, cigars */}
      <Orbit radius={3.4} speed={0.18} incline={[0.15, 0.9, -0.15]} phase={3.5} bob={0.15}>
        <Triangle />
      </Orbit>
      <Orbit radius={3.0} speed={0.27} incline={[-0.3, -0.8, 0.9]} phase={2.7}>
        <Chevron />
      </Orbit>
      <Orbit radius={3.7} speed={-0.14} incline={[0.4, 0.3, 1.2]} phase={1.6} bob={0.1}>
        <Cigar />
      </Orbit>

      {/* Orbs, eggs, diamonds, rings, cube-in-sphere, jellyfish */}
      <Orbit radius={2.4} speed={0.75} incline={[-0.2, 0.1, -1.0]} phase={0.3} jumpy bob={0.03}>
        <PlasmaOrb />
      </Orbit>
      <Orbit radius={2.7} speed={-0.65} incline={[1.0, -1.0, 0]} phase={2.9} bob={0.05}>
        <PlasmaOrb color="#5effd8" />
      </Orbit>
      <Orbit radius={2.85} speed={0.48} incline={[-1.3, 0.4, 0.8]} phase={5.8} jumpy bob={0.02}>
        <EggCraft />
      </Orbit>
      <Orbit radius={3.15} speed={-0.33} incline={[0.7, 0.6, -0.9]} phase={3.9}>
        <Diamond />
      </Orbit>
      <Orbit radius={3.45} speed={0.24} incline={[-0.7, 1.3, 0.1]} phase={0.6}>
        <RingCraft />
      </Orbit>
      <Orbit radius={2.65} speed={0.4} incline={[0.2, -1.2, -0.7]} phase={6.2} jumpy bob={0.03}>
        <CubeSphere />
      </Orbit>
      <Orbit radius={3.3} speed={-0.16} incline={[1.2, 0.8, 0.6]} phase={4.9} bob={0.2}>
        <Jellyfish />
      </Orbit>
      <Orbit radius={2.5} speed={0.55} incline={[-0.6, -0.4, -0.3]} phase={1.2} bob={0.04}>
        <FooFighters />
      </Orbit>

      <HeroAlien />
      <Mothership />
    </group>
  );
}
