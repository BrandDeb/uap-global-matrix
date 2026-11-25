'use client';

/**
 * src/components/map/AlienEarth.tsx
 * ---------------------------------------------------------------------------
 * Shader-driven "xeno" Earth:
 *   - surface: night-lights texture re-tinted to bioluminescent teal/violet,
 *     a scrolling holographic lat/long lattice, scan sweep and fresnel rim
 *   - atmosphere: back-face fresnel glow shell (additive)
 *   - halo rings: thin orbital rings with travelling glyph dashes
 * Markers + FX are parented to the surface mesh so they rotate with it.
 * ---------------------------------------------------------------------------
 */

import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  type Group,
  type Mesh,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '@/lib/geo';
import { SHADER_TIME } from './sharedTime';
import { easing } from 'maath';


const surfaceVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPosL;
  void main() {
    vUv = uv;
    vPosL = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const surfaceFrag = /* glsl */ `
  uniform sampler2D uNight;
  uniform sampler2D uTopo;
  uniform float uTime;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uRim;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPosL;

  float grid(vec2 uv, vec2 cells, float w) {
    vec2 g = abs(fract(uv * cells - 0.5) - 0.5) / fwidth(uv * cells);
    return 1.0 - min(min(g.x, g.y) / w, 1.0);
  }

  void main() {
    vec3 night = texture2D(uNight, vUv).rgb;
    float topo = texture2D(uTopo, vUv).r;
    float lum = dot(night, vec3(0.299, 0.587, 0.114));

    // Land mask from topology; oceans sit dark, continents glow faintly.
    float land = smoothstep(0.02, 0.12, topo);
    vec3 base = mix(vec3(0.003, 0.006, 0.02), mix(uColB, uColA, 0.35) * 0.16, land);
    base += uColA * topo * 0.12;

    // City lights become bioluminescent nodes.
    vec3 lights = mix(uColA, vec3(1.0, 0.95, 0.8), smoothstep(0.5, 1.0, lum)) * pow(lum, 1.4) * 2.4;

    // Holographic lattice + slow drifting finer grid.
    float g1 = grid(vUv, vec2(36.0, 18.0), 0.8) * 0.07;
    float g2 = grid(vUv + vec2(uTime * 0.004, 0.0), vec2(144.0, 72.0), 1.0) * 0.05 * land;
    vec3 lattice = uColA * (g1 + g2);

    // Scan sweep travelling pole to pole.
    float sweepY = fract(uTime * 0.06);
    float sweep = smoothstep(0.006, 0.0, abs(vUv.y - sweepY)) * 0.5;
    vec3 sweepCol = uRim * sweep * (0.3 + land);

    // Hex-ish shimmer noise on land.
    float shimmer = sin(vPosL.x * 40.0 + uTime) * sin(vPosL.y * 40.0 - uTime * 0.7) * sin(vPosL.z * 40.0);
    vec3 shimmerCol = uColB * smoothstep(0.85, 1.0, shimmer) * land * 0.35;

    float fres = pow(1.0 - max(dot(vNormalW, vViewDir), 0.0), 3.0);
    vec3 rim = uRim * fres * 0.9;

    gl_FragColor = vec4(base + lights + lattice + sweepCol + shimmerCol + rim, 1.0);
    #include <colorspace_fragment>
  }
`;

const atmoVert = /* glsl */ `
  varying vec3 vNormalV;
  void main() {
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmoFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vNormalV;
  void main() {
    float i = pow(0.62 - dot(vNormalV, vec3(0.0, 0.0, 1.0)), 5.0);
    float pulse = 0.85 + 0.15 * sin(uTime * 0.8);
    gl_FragColor = vec4(uColor * i * 2.2 * pulse, i);
  }
`;

const ringFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSpeed;
  varying vec2 vUv;
  void main() {
    float a = vUv.x;
    float dash = step(0.55, fract(a * 120.0 + uTime * uSpeed));
    float comet = pow(fract(a - uTime * uSpeed * 0.02), 12.0);
    float edge = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
    float alpha = (dash * 0.35 + comet * 1.6) * edge;
    gl_FragColor = vec4(uColor * (0.6 + comet * 2.0), alpha);
  }
`;
const ringVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // ringGeometry uv: remap to angle (x) and radial (y)
    vec2 p = position.xy;
    vUv = vec2(atan(p.y, p.x) / 6.2831853 + 0.5, uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function HaloRing({
  radius,
  tilt,
  color,
  speed,
}: {
  radius: number;
  tilt: [number, number, number];
  color: string;
  speed: number;
}) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ringVert,
        fragmentShader: ringFrag,
        uniforms: { uColor: { value: new Color(color) }, uTime: SHADER_TIME, uSpeed: { value: speed } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [color, speed],
  );
  const ref = useRef<Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.z += d * speed * 0.05;
  });
  return (
    <group rotation={tilt}>
      <mesh ref={ref} material={mat}>
        <ringGeometry args={[radius, radius + 0.012, 256, 1]} />
      </mesh>
    </group>
  );
}

interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

const Y_AXIS = new Vector3(0, 1, 0);
const CAMERA_DIR = new Vector3(0, 0, 1);
const tmpDir = new Vector3();
const tmpQuat = new Quaternion();

export default function AlienEarth({
  focusPoint,
  children,
  segments = 128,
}: {
  focusPoint?: GeoPoint | null;
  children?: ReactNode;
  /** Planet sphere tessellation (quality tier). */
  segments?: number;
}) {
  const [night, topo] = useTexture(
    ['/textures/earth-night.jpg', '/textures/earth-topology.png'],
    (loaded) => {
      const albedo = Array.isArray(loaded) ? loaded[0] : loaded;
      if (albedo) albedo.colorSpace = SRGBColorSpace;
    },
  );

  const surface = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: surfaceVert,
        fragmentShader: surfaceFrag,
        uniforms: {
          uNight: { value: night },
          uTopo: { value: topo },
          uTime: SHADER_TIME,
          uColA: { value: new Color('#5effd8') },
          uColB: { value: new Color('#7c5cff') },
          uRim: { value: new Color('#38e8ff') },
        },
      }),
    [night, topo],
  );

  const atmo = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: atmoFrag,
        uniforms: { uColor: { value: new Color('#3cf2ff') }, uTime: SHADER_TIME },
        blending: AdditiveBlending,
        side: BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const earthRef = useRef<Mesh>(null);
  const tiltRef = useRef<Group>(null);
  const spin = useRef(0);

  useFrame(({ pointer }, delta) => {
    const mesh = earthRef.current;
    if (!mesh) return;
    spin.current += delta * 0.08;
    if (focusPoint) {
      latLngToVector3(focusPoint.latitude, focusPoint.longitude, 1, tmpDir).normalize();
      tmpQuat.setFromUnitVectors(tmpDir, CAMERA_DIR);
      easing.dampQ(mesh.quaternion, tmpQuat, 0.35, delta);
    } else {
      tmpQuat.setFromAxisAngle(Y_AXIS, spin.current);
      easing.dampQ(mesh.quaternion, tmpQuat, 0.5, delta);
    }
    // Subtle parallax lean toward the pointer.
    const g = tiltRef.current;
    if (g) easing.dampE(g.rotation, [pointer.y * -0.12, pointer.x * 0.18, 0], 0.6, delta);
  });

  return (
    <group ref={tiltRef}>
      <mesh ref={earthRef} material={surface}>
        <sphereGeometry args={[GLOBE_RADIUS, segments, segments]} />
        {children}
      </mesh>
      <mesh scale={1.12} material={atmo}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      </mesh>
      <HaloRing radius={GLOBE_RADIUS * 1.32} tilt={[1.25, 0.2, 0]} color="#5effd8" speed={0.6} />
      <HaloRing radius={GLOBE_RADIUS * 1.5} tilt={[1.75, -0.35, 0.3]} color="#a58bff" speed={-0.4} />
      <HaloRing radius={GLOBE_RADIUS * 1.78} tilt={[1.45, 0.6, -0.2]} color="#38e8ff" speed={0.25} />
    </group>
  );
}
