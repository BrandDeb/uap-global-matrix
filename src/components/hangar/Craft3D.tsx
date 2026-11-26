'use client';

/**
 * src/components/hangar/Craft3D.tsx
 * ---------------------------------------------------------------------------
 * Real-time 3D preview of the assembled craft, built procedurally from the
 * Spore-style BLUEPRINT with three.js/WebGL: a hull plus every placed module
 * (thruster nozzle+plume, wing slab/ring, weapon barrel) rendered at its
 * blueprint (x,y). Lit with key + rim lights on a slow turntable; rebuilds
 * when the blueprint changes.
 *
 * Blueprint space -> world:  x in [-1,1] -> +X (right),  y in [-1,1] -> +Z (nose).
 * ---------------------------------------------------------------------------
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PART_BY_ID, type Blueprint } from '@/lib/craft';

const FLAME_TINT: Record<string, string> = { ion: '#8af2ff', pulse: '#ffffff', plasma: '#ff9a7a', warp: '#d2b4ff', void: '#5effd8' };

export default function Craft3D({ bp, className }: { bp: Blueprint; className?: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const key = `${bp.hull}|${bp.color}|${bp.modules.map((m) => `${m.part}@${m.x.toFixed(2)},${m.y.toFixed(2)}`).join(';')}`;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const w = el.clientWidth || 340;
    const h = el.clientHeight || 300;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    cam.position.set(0, 3.1, 6.1);
    cam.lookAt(0, 0, 0);

    const col = new THREE.Color(bp.color);
    const steel = new THREE.Color('#2a2f3a');
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(-4, 6, 5);
    scene.add(keyLight);
    const rim = new THREE.PointLight(col.getHex(), 2.2, 30);
    rim.position.set(4, 1, -3);
    scene.add(rim);

    const ship = new THREE.Group();
    scene.add(ship);

    const hull = PART_BY_ID[bp.hull];
    const size = hull?.size ?? 1;
    const shape = hull?.shape ?? 'falcon';
    const body = new THREE.MeshStandardMaterial({ color: col, metalness: 0.8, roughness: 0.3, emissive: col, emissiveIntensity: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: steel, metalness: 0.85, roughness: 0.45 });
    const glass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#e6ffff'), metalness: 0.1, roughness: 0.08, emissive: col, emissiveIntensity: 0.55 });

    const bw = ({ dart: 0.42, falcon: 0.55, manta: 0.7, juggernaut: 0.72, phantom: 0.5, titan: 0.8 }[shape] ?? 0.55) * size;
    const len = (shape === 'dart' || shape === 'phantom' ? 2.6 : 2.2) * size;
    // Blueprint (x,y) -> world (X,Z). Kept close to the hull so parts attach.
    const WX = bw * 1.15;
    const WZ = len * 0.42;

    // Fuselage hull.
    const fuse = new THREE.Mesh(new THREE.CapsuleGeometry(bw * 0.5, len * 0.7, 6, 16), body);
    fuse.rotation.x = Math.PI / 2;
    fuse.scale.set(1.05, 0.42, 1);
    ship.add(fuse);
    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.3, len * 0.5, 14), body);
    noseCone.rotation.x = -Math.PI / 2;
    noseCone.scale.set(1.05, 1, 0.42);
    noseCone.position.z = len * 0.48;
    ship.add(noseCone);
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.26 * size, 20, 16), glass);
    cockpit.position.set(0, 0.16 * size, 0.28 * size);
    cockpit.scale.set(1, 0.8, 1.5);
    ship.add(cockpit);

    const flames: THREE.Mesh[] = [];

    // Place every module at its blueprint coordinate.
    for (const m of bp.modules) {
      const part = PART_BY_ID[m.part];
      if (!part) continue;
      const px = m.x * WX;
      const pz = m.y * WZ;

      if (part.slot === 'thrusters') {
        const tint = FLAME_TINT[part.flame ?? 'ion'];
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * size, 0.1 * size, 0.28 * size, 12), dark);
        nozzle.rotation.x = Math.PI / 2;
        nozzle.position.set(px, 0, pz - 0.12 * size);
        ship.add(nozzle);
        const flameMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint), emissive: new THREE.Color(tint), emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.5 });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13 * size, 0.8 * size, 12), flameMat);
        flame.rotation.x = Math.PI / 2;
        flame.position.set(px, 0, pz - 0.5 * size);
        ship.add(flame);
        flames.push(flame);
      } else if (part.slot === 'wings') {
        if (part.wingShape === 'ring') {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34 * size, 0.06 * size, 10, 22), dark);
          ring.position.set(px, 0, pz);
          ship.add(ring);
        } else {
          const dir = m.x >= 0 ? 1 : -1;
          const spread = ({ stub: 0.42, delta: 0.52, swept: 0.56, solar: 0.64, reaper: 0.6 }[part.wingShape ?? 'stub'] ?? 0.5) * size;
          const sweep = part.wingShape === 'swept' || part.wingShape === 'reaper' ? -0.55 : -0.2;
          const sh = new THREE.Shape();
          sh.moveTo(0, 0.2 * size);
          sh.lineTo(dir * spread, sweep * size);
          sh.lineTo(dir * spread * 0.55, -0.55 * size);
          sh.lineTo(0, -0.38 * size);
          sh.closePath();
          const wingMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.5), metalness: 0.8, roughness: 0.4, emissive: col, emissiveIntensity: 0.06 });
          const wg = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.07 * size, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), wingMat);
          wg.rotation.x = -Math.PI / 2;
          wg.position.set(px, -0.02 * size, pz);
          ship.add(wg);
          // wing-gun barrels
          for (let i = 1; i <= (part.wingGuns ?? 0); i++) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * size, 0.04 * size, 0.6 * size, 8), dark);
            bar.rotation.x = Math.PI / 2;
            bar.position.set(px + dir * (spread * 0.5 + i * 0.1 * size), -0.02 * size, pz + 0.4 * size);
            ship.add(bar);
          }
        }
      } else if (part.slot === 'weapon') {
        const glow = part.rarity === 'legendary' || part.shot === 'seeker';
        const barMat = glow
          ? new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, metalness: 0.3, roughness: 0.4 })
          : dark;
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * size, 0.08 * size, 0.55 * size, 10), barMat);
        gun.rotation.x = Math.PI / 2;
        gun.position.set(px, 0.02 * size, pz + 0.26 * size);
        ship.add(gun);
      }
    }

    ship.rotation.x = 0.34;

    let raf = 0;
    let t = 0;
    const loop = () => {
      t += 0.016;
      ship.rotation.y = t * 0.35;
      ship.position.y = Math.sin(t * 1.3) * 0.08;
      for (const f of flames) {
        const s = 0.7 + Math.sin(t * 25 + f.position.x) * 0.3;
        f.scale.set(1, s, 1);
        (f.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + s;
      }
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      const nw = el.clientWidth || w;
      const nh = el.clientHeight || h;
      renderer.setSize(nw, nh);
      cam.aspect = nw / nh;
      cam.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mm.dispose());
        }
      });
      el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={mount} className={className} />;
}
