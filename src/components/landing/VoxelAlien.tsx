'use client';

/**
 * src/components/landing/VoxelAlien.tsx
 * ---------------------------------------------------------------------------
 * "Zorp", an original voxel alien generated procedurally from implicit
 * shapes (big-skull ellipsoid, almond eyes, antennae with glowing tips, a
 * little body and noodle arms) and rendered as ONE InstancedMesh.
 *
 * Interaction:
 *   - every voxel is spring-tied to its home position
 *   - voxels near the pointer get shoved away ("petting")
 *   - click → he explodes into a cube cloud and reassembles
 *   - bobs and pulses with the soundtrack level, and his head tracks you
 * ---------------------------------------------------------------------------
 */

import { useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Color, type Group, type InstancedMesh, Object3D, Plane, Vector3 } from 'three';
import { easing } from 'maath';
import { xenoAudio } from './audio';
import { landing } from './landingStore';

const V = 0.11; // voxel size

interface Voxel {
  home: Vector3;
  color: Color;
  head: boolean;
}

/** Build the alien from implicit shapes on an integer grid. */
function buildZorp(): Voxel[] {
  const out: Voxel[] = [];
  const skin = new Color('#7dffb0');
  const skinDark = new Color('#3fd68a');
  const eye = new Color('#06060c');
  const shine = new Color('#ffffff');
  const glow = new Color('#ff5ec8');
  const belly = new Color('#c8ffe0');
  const inEllipsoid = (x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1;

  for (let x = -9; x <= 9; x++) {
    for (let y = -11; y <= 12; y++) {
      for (let z = -7; z <= 7; z++) {
        // Head: wide at the top, tapering chin (radius shrinks with lower y).
        const taper = y < 3 ? 0.55 + (y + 3) * 0.075 : 1;
        const head = inEllipsoid(x, y, z, 0, 4, 0, 8 * taper, 7, 6.2 * Math.max(0.7, taper));
        const body = inEllipsoid(x, y, z, 0, -7, 0, 3.4, 4, 2.8);
        const neck = Math.abs(x) <= 1 && Math.abs(z) <= 1 && y >= -4 && y <= -2;
        if (!head && !body && !neck) continue;
        // Hollow interior: only keep voxels with an empty neighbor somewhere.
        const solid = (a: number, b: number, c: number) => {
          const t = b < 3 ? 0.55 + (b + 3) * 0.075 : 1;
          return (
            inEllipsoid(a, b, c, 0, 4, 0, 8 * t, 7, 6.2 * Math.max(0.7, t)) ||
            inEllipsoid(a, b, c, 0, -7, 0, 3.4, 4, 2.8) ||
            (Math.abs(a) <= 1 && Math.abs(c) <= 1 && b >= -4 && b <= -2)
          );
        };
        if (solid(x + 1, y, z) && solid(x - 1, y, z) && solid(x, y + 1, z) && solid(x, y - 1, z) && solid(x, y, z + 1) && solid(x, y, z - 1)) continue;

        let color = (x + y + z) % 3 === 0 ? skinDark : skin;
        if (head) {
          // Almond eyes on the front face, tilted outward.
          for (const s of [-1, 1]) {
            const ex = x - s * 3.6;
            const ey = y - 3.2 - ex * 0.35 * s;
            if ((ex / 2.6) ** 2 + (ey / 1.6) ** 2 <= 1 && z > 2) color = eye;
            if (Math.abs(ex + 0.8 * s) < 0.6 && Math.abs(ey - 0.6) < 0.6 && z > 2) color = shine;
          }
          // Little smile.
          if (z > 3 && y === -1 && Math.abs(x) <= 2) color = eye;
          if (z > 3 && y === 0 && Math.abs(x) === 3) color = eye;
        }
        if (body && z > 1 && Math.abs(x) <= 1 && y > -9 && y < -5) color = belly;
        out.push({ home: new Vector3(x * V, y * V, z * V), color, head: head && !body });
      }
    }
  }
  // Antennae with glowing bobbles.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      out.push({ home: new Vector3((s * 3 + s * i * 0.6) * V, (11 + i) * V, 0), color: skinDark, head: true });
    }
    for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      out.push({ home: new Vector3((s * 6 + dx) * V, (16.5 + dy) * V, dz * V), color: glow, head: true });
    }
  }
  // Noodle arms (one waving).
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const wave = s > 0 ? i * 0.9 : -i * 0.2;
      out.push({ home: new Vector3((s * (3.5 + i * 0.8)) * V, (-6 + wave) * V, 0), color: skin, head: false });
    }
  }
  return out;
}

const dummy = new Object3D();
const plane = new Plane(new Vector3(0, 0, 1), 0);
const hit = new Vector3();
const tmp = new Vector3();

export default function VoxelAlien({ narrow }: { narrow: boolean }) {
  const voxels = useMemo(() => buildZorp(), []);
  const mesh = useRef<InstancedMesh>(null);
  const root = useRef<Group>(null);
  // Per-voxel physics lives in a ref (mutated every frame, never rendered).
  const sim = useRef<{ offset: Vector3[]; vel: Vector3[]; colored: boolean; lastPet: number } | null>(null);
  const getSim = () =>
    (sim.current ??= {
      offset: voxels.map(() => new Vector3()),
      vel: voxels.map(() => new Vector3()),
      colored: false,
      lastPet: 0,
    });
  const { camera, raycaster, pointer } = useThree();

  const explode = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    getSim().vel.forEach((v) => v.set((Math.random() - 0.5) * 9, Math.random() * 7 + 1, (Math.random() - 0.5) * 9));
    xenoAudio?.boop();
  };

  useFrame(({ clock }, d) => {
    const m = mesh.current;
    const r = root.current;
    if (!m || !r) return;
    const state = getSim();
    const dt = Math.min(d, 1 / 30);
    const t = clock.getElapsedTime();
    const lvl = xenoAudio?.level() ?? 0;
    const show = landing.voxel;

    // Enter / exit + position.
    const s = Math.max(0.0001, show) * (narrow ? 0.85 : 1.15);
    easing.damp3(r.scale, [s, s, s], 0.25, d);
    easing.damp3(r.position, [narrow ? 0 : 2.1, (narrow ? 1.2 : 0) + Math.sin(t * 2) * 0.08 + lvl * 0.25, 0], 0.3, d);
    // Head tracks the pointer.
    easing.dampE(r.rotation, [-pointer.y * 0.25, pointer.x * 0.6 + Math.sin(t * 0.6) * 0.15, Math.sin(t * 1.3) * 0.05], 0.3, d);

    if (!state.colored) {
      voxels.forEach((v, i) => m.setColorAt(i, v.color));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      state.colored = true;
    }

    // Pointer → local space point on the alien's z=0 plane.
    raycaster.setFromCamera(pointer, camera);
    plane.set(new Vector3(0, 0, 1).applyQuaternion(r.quaternion), -r.position.dot(new Vector3(0, 0, 1).applyQuaternion(r.quaternion)));
    const hasHit = show > 0.5 && raycaster.ray.intersectPlane(plane, hit) !== null;
    if (hasHit) r.worldToLocal(hit);

    let petted = false;
    for (let i = 0; i < voxels.length; i++) {
      const off = state.offset[i];
      const vel = state.vel[i];
      if (hasHit) {
        tmp.copy(voxels[i].home).add(off).sub(hit);
        tmp.z = 0;
        const dist = tmp.length();
        if (dist < 0.55) {
          vel.addScaledVector(tmp.normalize(), (0.55 - dist) * 40 * dt);
          vel.z += (Math.random() - 0.3) * 6 * dt;
          petted = true;
        }
      }
      // Spring home + damping.
      vel.addScaledVector(off, -26 * dt);
      vel.multiplyScalar(1 - 5.5 * dt);
      off.addScaledVector(vel, dt);

      const pulse = 1 + lvl * 0.35 * (voxels[i].head ? 1 : 0.5);
      dummy.position.copy(voxels[i].home).add(off);
      dummy.rotation.set(off.y * 4, off.x * 4, 0);
      dummy.scale.setScalar(V * 0.92 * pulse);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (petted && t - state.lastPet > 0.12) {
      state.lastPet = t;
      xenoAudio?.blip(0.4 + Math.random() * 0.6);
    }
  });

  return (
    <group ref={root} scale={0.0001}>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, voxels.length]}
        frustumCulled={false}
        onClick={explode}
        onPointerOver={() => {
          document.body.dataset.cursor = 'pet';
        }}
        onPointerOut={() => {
          delete document.body.dataset.cursor;
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.45} metalness={0.1} emissive="#1a3326" />
      </instancedMesh>
    </group>
  );
}
