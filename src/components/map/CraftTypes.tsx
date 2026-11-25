'use client';

/**
 * src/components/map/CraftTypes.tsx
 * ---------------------------------------------------------------------------
 * The wider catalogue of procedural anomalous craft, built from primitives.
 * Each one is authored in "craft space" for <Orbit>: +Z = direction of travel,
 * +Y = away from the planet, unit size ≈ 1 before the outer scale.
 *
 *   BellSaucer   domed bell-shaped scout with portholes + three landing pods
 *   Cigar        long cylindrical carrier with a strip of lit windows
 *   PlasmaOrb    pulsing fresnel energy sphere
 *   Chevron      V / boomerang of lights on a dark wing
 *   Diamond      spinning faceted octahedron
 *   RingCraft    rotating torus with a floating core
 *   CubeSphere   dark cube inside a translucent sphere
 *   Jellyfish    translucent bell with swaying tendrils
 *   EggCraft     glowing ovoid
 *   FooFighters  small swarm of darting lights
 * ---------------------------------------------------------------------------
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type Group,
  LatheGeometry,
  type Mesh,
  ShaderMaterial,
  Shape,
  Vector2,
} from 'three';
import { SHADER_TIME } from './sharedTime';
import LightDots, { circleDots, type Dot } from './LightDots';

const ring = (n: number) => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2);

/* --- Bell saucer ------------------------------------------------------------ */

const BELL = [
  [0, -0.05],
  [0.9, -0.05],
  [1.0, 0.02],
  [0.75, 0.12],
  [0.5, 0.2],
  [0.42, 0.5],
  [0.3, 0.62],
  [0, 0.66],
].map(([x, y]) => new Vector2(x, y));

export function BellSaucer({ color = '#ffd36b' }: { color?: string }) {
  const geo = useMemo(() => new LatheGeometry(BELL, 48), []);
  const portholes = useMemo(() => circleDots(8, 0.44, 0.36, () => color), [color]);
  const spin = useRef<Group>(null);
  useFrame((_, d) => {
    if (spin.current) spin.current.rotation.y += d * 0.8;
  });
  return (
    <group scale={0.1}>
      <group ref={spin}>
        <mesh geometry={geo}>
          <meshStandardMaterial color="#c9ccd6" metalness={0.9} roughness={0.25} />
        </mesh>
        <LightDots dots={portholes} radius={0.06} />
      </group>
      {ring(3).map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.5, -0.16, Math.sin(a) * 0.5]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial color="#e8e9ee" metalness={0.6} roughness={0.2} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* --- Cigar carrier ---------------------------------------------------------- */

export function Cigar() {
  return (
    <group scale={0.09}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.32, 2.6, 8, 24]} />
        <meshStandardMaterial color="#8d93a3" metalness={0.85} roughness={0.3} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[0.31, 0.05, -1.2 + i * 0.24]}>
          <boxGeometry args={[0.04, 0.08, 0.12]} />
          <meshBasicMaterial color={i % 4 === 0 ? '#ff5ec8' : '#fff1b8'} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0, -1.65]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color="#38e8ff" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* --- Plasma orb ------------------------------------------------------------- */

const orbVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    vP = position;
    vec4 wp = modelMatrix * vec4(position,1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const orbFrag = /* glsl */ `
  uniform float uTime; uniform vec3 uColor;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);
    float swirl = 0.5 + 0.5 * sin(vP.x * 9.0 + uTime * 3.0) * sin(vP.y * 9.0 - uTime * 2.0);
    float pulse = 0.75 + 0.25 * sin(uTime * 4.0);
    gl_FragColor = vec4(uColor * (f * 2.2 + swirl * 0.6) * pulse, f + 0.35);
  }
`;

export function PlasmaOrb({ color = '#ff8a3d' }: { color?: string }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: orbVert,
        fragmentShader: orbFrag,
        uniforms: { uTime: SHADER_TIME, uColor: { value: new Color(color) } },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [color],
  );
  return (
    <group scale={0.05}>
      <mesh material={mat}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* --- Chevron / boomerang ---------------------------------------------------- */

const CHEVRON_DOTS: Dot[] = (
  [
    [0, 0.9],
    [0.4, 0.35],
    [0.8, -0.2],
    [1.1, -0.6],
    [-0.4, 0.35],
    [-0.8, -0.2],
    [-1.1, -0.6],
  ] as const
).map(([x, y]) => ({ position: [x, y, -0.04] as const, color: '#ffb347' }));

export function Chevron() {
  const shape = useMemo(() => {
    const s = new Shape();
    s.moveTo(0, 1);
    s.lineTo(1.2, -0.6);
    s.lineTo(0.9, -0.7);
    s.lineTo(0, 0.4);
    s.lineTo(-0.9, -0.7);
    s.lineTo(-1.2, -0.6);
    s.closePath();
    return s;
  }, []);
  return (
    // Shape is in XY; lay it flat (XZ) with the point facing +Z.
    <group scale={0.12} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <extrudeGeometry args={[shape, { depth: 0.08, bevelEnabled: false }]} />
        <meshStandardMaterial color="#07070c" metalness={0.7} roughness={0.5} />
      </mesh>
      <LightDots dots={CHEVRON_DOTS} radius={0.07} />
    </group>
  );
}

/* --- Diamond ---------------------------------------------------------------- */

export function Diamond({ color = '#5effd8' }: { color?: string }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 1.6;
  });
  return (
    <group scale={0.07}>
      <mesh ref={ref} scale={[0.7, 1.2, 0.7]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#d7fff4" metalness={0.3} roughness={0.05} emissive={color} emissiveIntensity={0.9} flatShading />
      </mesh>
    </group>
  );
}

/* --- Ring craft ------------------------------------------------------------- */

const RING_DOTS = circleDots(12, 0.8, 0.13, () => '#ffffff');

export function RingCraft({ color = '#a58bff' }: { color?: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }, d) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y += d * 1.2;
    g.children[1]?.position.setY(Math.sin(clock.getElapsedTime() * 2) * 0.12);
  });
  return (
    <group scale={0.1}>
      <group ref={ref}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.12, 16, 64]} />
          <meshStandardMaterial color="#232536" metalness={0.9} roughness={0.25} emissive={color} emissiveIntensity={0.35} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.22, 1]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <LightDots dots={RING_DOTS} radius={0.035} detail={6} />
      </group>
    </group>
  );
}

/* --- Cube inside a sphere --------------------------------------------------- */

export function CubeSphere() {
  const ref = useRef<Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) {
      ref.current.rotation.x += d * 0.7;
      ref.current.rotation.y += d * 0.9;
    }
  });
  return (
    <group scale={0.07}>
      <mesh ref={ref}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#050508" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial color="#cfe9ff" transmission={0.9} roughness={0.1} transparent opacity={0.25} emissive="#9fd6ff" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

/* --- Jellyfish -------------------------------------------------------------- */

export function Jellyfish({ color = '#ff5ec8' }: { color?: string }) {
  const tendrils = useRef<Group>(null);
  const bell = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (bell.current) bell.current.scale.set(1 + Math.sin(t * 2) * 0.08, 1 - Math.sin(t * 2) * 0.08, 1 + Math.sin(t * 2) * 0.08);
    tendrils.current?.children.forEach((c, i) => {
      c.rotation.x = Math.sin(t * 1.8 + i) * 0.35;
      c.rotation.z = Math.cos(t * 1.4 + i * 0.7) * 0.25;
    });
  });
  return (
    <group scale={0.09}>
      <mesh ref={bell}>
        <sphereGeometry args={[0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.55} side={DoubleSide} toneMapped={false} />
      </mesh>
      <group ref={tendrils}>
        {ring(7).map((a) => (
          <group key={a} position={[Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45]}>
            <mesh position={[0, -0.6, 0]}>
              <cylinderGeometry args={[0.025, 0.005, 1.2, 6]} />
              <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* --- Egg -------------------------------------------------------------------- */

export function EggCraft() {
  return (
    <group scale={0.06}>
      <mesh scale={[0.75, 1.1, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#fff4d6" emissive="#ffcf7a" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* --- Foo fighter swarm ------------------------------------------------------ */

export function FooFighters({ count = 6, color = '#ffe08a' }: { count?: number; color?: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current?.children.forEach((c, i) => {
      const k = i * 1.7;
      c.position.set(Math.sin(t * 2.1 + k) * 0.12, Math.cos(t * 1.7 + k) * 0.06, Math.sin(t * 1.3 + k * 2) * 0.12);
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
