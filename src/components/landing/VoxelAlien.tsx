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

import { useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Color, type Group, type InstancedMesh, Object3D, Plane, Vector3 } from 'three';
import { easing } from 'maath';
import { xenoAudio } from './audio';
import { landing } from './landingStore';
import { findEgg } from './eggs';

import { SPECIES, type Voxel } from './voxelSpecies';

const V = 0.11;
const MAX = Math.max(...SPECIES.map((sp) => sp.voxels.length));

const dummy = new Object3D();
const plane = new Plane(new Vector3(0, 0, 1), 0);
const hit = new Vector3();
const tmp = new Vector3();

export default function VoxelAlien({ narrow }: { narrow: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const root = useRef<Group>(null);
  // Per-voxel physics lives in a ref (mutated every frame, never rendered).
  const sim = useRef<{ offset: Vector3[]; vel: Vector3[]; species: number; lastPet: number } | null>(null);
  const getSim = () =>
    (sim.current ??= {
      offset: Array.from({ length: MAX }, () => new Vector3()),
      vel: Array.from({ length: MAX }, () => new Vector3()),
      species: -1,
      lastPet: 0,
    });
  const { camera, raycaster, pointer } = useThree();

  const explode = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    getSim().vel.forEach((v) => v.set((Math.random() - 0.5) * 9, Math.random() * 7 + 1, (Math.random() - 0.5) * 9));
    xenoAudio?.boop();
    findEgg('explode');
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

    // Species swap: recolor, then fling the cubes so they reassemble into the new shape.
    const idx = Math.min(SPECIES.length - 1, Math.max(0, landing.species));
    const voxels = SPECIES[idx].voxels;
    if (state.species !== idx) {
      voxels.forEach((v, i) => m.setColorAt(i, v.color));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.count = voxels.length;
      if (state.species !== -1) {
        for (let i = 0; i < voxels.length; i++) {
          state.offset[i].set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2);
          state.vel[i].set(0, 0, 0);
        }
        xenoAudio?.whoosh();
      }
      state.species = idx;
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
        args={[undefined, undefined, MAX]}
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
