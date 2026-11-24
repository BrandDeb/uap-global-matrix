'use client';

/**
 * src/components/map/Trajectories.tsx
 * Animated "craft trajectory" arcs linking recent contacts. Each arc is a
 * lifted quadratic bezier tube with a shader comet travelling along it.
 */

import { useMemo } from 'react';
import {
  AdditiveBlending,
  Color,
  QuadraticBezierCurve3,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '@/lib/geo';
import { SHADER_TIME } from './sharedTime';


const vert = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const frag = /* glsl */ `
  uniform float uTime;
  uniform float uOffset;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main(){
    float head = fract(uTime * 0.25 + uOffset);
    float d = head - vUv.x;
    float tail = d > 0.0 ? exp(-d * 9.0) : 0.0;
    float base = 0.07;
    gl_FragColor = vec4(uColor * (1.0 + tail * 3.0), base + tail);
  }
`;

interface Pt {
  readonly latitude: number;
  readonly longitude: number;
}

const PALETTE = ['#5effd8', '#a58bff', '#38e8ff', '#ff5ec8'];

export default function Trajectories({ points, max = 18 }: { points: readonly Pt[]; max?: number }) {
  const arcs = useMemo(() => {
    const valid = points.filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && !(p.latitude === 0 && p.longitude === 0),
    );
    const out: { geo: TubeGeometry; mat: ShaderMaterial }[] = [];
    for (let i = 0; i + 1 < valid.length && out.length < max; i++) {
      const a = latLngToVector3(valid[i].latitude, valid[i].longitude, GLOBE_RADIUS, new Vector3());
      const b = latLngToVector3(valid[i + 1].latitude, valid[i + 1].longitude, GLOBE_RADIUS, new Vector3());
      const dist = a.distanceTo(b);
      if (dist < 0.15) continue;
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS + dist * 0.45);
      const curve = new QuadraticBezierCurve3(a, mid, b);
      const geo = new TubeGeometry(curve, 64, 0.004, 6, false);
      const mat = new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTime: SHADER_TIME,
          uOffset: { value: (out.length * 0.618) % 1 },
          uColor: { value: new Color(PALETTE[out.length % PALETTE.length]) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      out.push({ geo, mat });
    }
    return out;
  }, [points, max]);

  return (
    <group>
      {arcs.map((a, i) => (
        <mesh key={i} geometry={a.geo} material={a.mat} raycast={() => null} />
      ))}
    </group>
  );
}
