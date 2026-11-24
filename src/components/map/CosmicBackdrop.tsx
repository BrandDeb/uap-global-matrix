'use client';

/**
 * src/components/map/CosmicBackdrop.tsx
 * Deep-space backdrop: a full-screen-ish nebula shader dome plus a twinkling
 * GPU point starfield and drifting "dust" motes near the camera.
 */

import { useMemo } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
} from 'three';
import { SHADER_TIME } from './sharedTime';

const nebulaFrag = /* glsl */ `
  uniform float uTime;
  varying vec3 vDir;
  float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5;} return v; }
  void main(){
    vec3 d = normalize(vDir);
    float t = uTime * 0.01;
    float n = fbm(d * 2.2 + vec3(t, -t*0.6, t*0.3));
    float n2 = fbm(d * 4.5 - vec3(t*0.5, t, 0.0) + n);
    vec3 violet = vec3(0.26, 0.10, 0.55);
    vec3 teal = vec3(0.02, 0.38, 0.40);
    vec3 magenta = vec3(0.45, 0.05, 0.30);
    vec3 col = mix(violet, teal, smoothstep(0.35, 0.75, n2));
    col = mix(col, magenta, smoothstep(0.6, 0.9, n) * 0.5);
    float mask = smoothstep(0.42, 0.85, n * 0.6 + n2 * 0.6);
    col *= mask * 0.55;
    gl_FragColor = vec4(col + vec3(0.003, 0.004, 0.012), 1.0);
  }
`;
const nebulaVert = /* glsl */ `
  varying vec3 vDir;
  void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

const starVert = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  varying float vTw;
  varying float vSeed;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vTw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 40.0);
    vSeed = aSeed;
    gl_PointSize = aSize * (260.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const starFrag = /* glsl */ `
  varying float vTw;
  varying float vSeed;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float cross = max(smoothstep(0.06,0.0,abs(c.x)), smoothstep(0.06,0.0,abs(c.y))) * smoothstep(0.5,0.1,d) * step(0.93, vSeed);
    vec3 col = mix(vec3(0.7,0.85,1.0), vec3(0.55,1.0,0.9), step(0.7, vSeed));
    col = mix(col, vec3(0.8,0.65,1.0), step(0.85, vSeed));
    gl_FragColor = vec4(col, (pow(core, 3.0) + cross) * vTw);
  }
`;

function makeStars(count: number, rMin: number, rMax: number, sizeMax: number) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    const s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
    size[i] = 0.4 + Math.pow(Math.random(), 4) * sizeMax;
    seed[i] = Math.random();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSize', new BufferAttribute(size, 1));
  g.setAttribute('aSeed', new BufferAttribute(seed, 1));
  return g;
}

export default function CosmicBackdrop() {
  const { nebula, starMat, far, dust } = useMemo(() => {
    const nebula = new ShaderMaterial({
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      uniforms: { uTime: SHADER_TIME },
      side: BackSide,
      depthWrite: false,
    });
    const starMat = new ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: { uTime: SHADER_TIME },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return {
      nebula,
      starMat,
      far: makeStars(6000, 60, 140, 5),
      dust: makeStars(500, 8, 30, 1.2),
    };
  }, []);

  return (
    <group>
      <mesh material={nebula} renderOrder={-10}>
        <sphereGeometry args={[180, 48, 48]} />
      </mesh>
      <points geometry={far} material={starMat} />
      <points geometry={dust} material={starMat} rotation={[0.3, 0, 0]} />
    </group>
  );
}
