'use client';

/**
 * src/components/hangar/Craft3D.tsx
 * ---------------------------------------------------------------------------
 * A real-time 3D preview of the assembled craft, built procedurally from the
 * equipped parts with three.js/WebGL. Fuselage, wings, thrusters and cockpit
 * are generated from the frame/wing/thruster/weapon ids and the livery colour,
 * lit with key + rim lights on a slow turntable. Rebuilds when parts change.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PART_BY_ID, type Craft } from '@/lib/craft';

export default function Craft3D({ craft, className }: { craft: Craft; className?: string }) {
  const mount = useRef<HTMLDivElement>(null);

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
    cam.position.set(0, 2.9, 5.9);
    cam.lookAt(0, 0, 0);

    const col = new THREE.Color(craft.color);
    const steel = new THREE.Color('#2a2f3a');
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-4, 6, 5);
    scene.add(key);
    const rim = new THREE.PointLight(col.getHex(), 2.2, 30);
    rim.position.set(4, 1, -3);
    scene.add(rim);

    const ship = new THREE.Group();
    scene.add(ship);
    const frame = PART_BY_ID[craft.frame];
    const wings = PART_BY_ID[craft.wings];
    const weap = PART_BY_ID[craft.weapon];
    const size = frame?.size ?? 1;
    const shape = frame?.shape ?? 'falcon';

    const flameTint = { ion: '#8af2ff', pulse: '#ffffff', plasma: '#ff9a7a', warp: '#d2b4ff', void: '#5effd8' }[PART_BY_ID[craft.thrusters]?.flame ?? 'ion'];
    const body = new THREE.MeshStandardMaterial({ color: col, metalness: 0.8, roughness: 0.3, emissive: col, emissiveIntensity: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: steel, metalness: 0.85, roughness: 0.45 });
    const glass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#e6ffff'), metalness: 0.1, roughness: 0.08, emissive: col, emissiveIntensity: 0.55 });
    const glowMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(flameTint), emissive: new THREE.Color(flameTint), emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.5 });

    // Convention: +Z = nose (forward), +Y = up, +X = right.
    const bw = { dart: 0.42, falcon: 0.55, manta: 0.7, juggernaut: 0.72, phantom: 0.5, titan: 0.8 }[shape] * size;
    const len = (shape === 'dart' || shape === 'phantom' ? 2.6 : 2.2) * size;

    // Fuselage: a capsule along Z, flattened to a sleek hull.
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(bw * 0.5, len * 0.7, 6, 16), body);
    hull.rotation.x = Math.PI / 2;          // capsule axis Y -> Z (nose forward)
    hull.scale.set(1.05, 0.42, 1);          // widen X, flatten Y
    ship.add(hull);
    // nose spike
    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.3, len * 0.5, 14), body);
    noseCone.rotation.x = -Math.PI / 2;
    noseCone.scale.set(1.05, 1, 0.42);
    noseCone.position.z = len * 0.48;
    ship.add(noseCone);

    // Cockpit glass, raised and forward.
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.26 * size, 20, 16), glass);
    cockpit.position.set(0, 0.16 * size, 0.28 * size);
    cockpit.scale.set(1, 0.8, 1.5);
    ship.add(cockpit);

    // Wings as thin angled slabs sweeping back from the mid-hull.
    const wingSpread = ({ stub: 1.05, delta: 1.3, swept: 1.3, ring: 1.0, solar: 1.55, reaper: 1.45 }[wings?.wingShape ?? 'stub'] ?? 1.3) * size;
    const sweep = wings?.wingShape === 'swept' || wings?.wingShape === 'reaper' ? -0.7 : -0.2;
    if ((wings?.wingShape ?? 'stub') === 'ring') {
      for (const d of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4 * size, 0.07 * size, 10, 22), dark);
        ring.position.set(d * bw * 1.7, 0, -0.1 * size);
        ship.add(ring);
      }
    } else {
      for (const d of [-1, 1]) {
        const wshape = new THREE.Shape();
        wshape.moveTo(0, 0.25 * size);
        wshape.lineTo(d * wingSpread, sweep * size);
        wshape.lineTo(d * wingSpread * 0.55, -0.7 * size);
        wshape.lineTo(0, -0.45 * size);
        wshape.closePath();
        const wingMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.5), metalness: 0.8, roughness: 0.4, emissive: col, emissiveIntensity: 0.06 });
        const wg = new THREE.Mesh(new THREE.ExtrudeGeometry(wshape, { depth: 0.08 * size, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), wingMat);
        wg.rotation.x = -Math.PI / 2;        // lay flat in XZ plane
        wg.position.y = -0.02 * size;
        ship.add(wg);
      }
    }
    // Wing-gun barrels.
    for (let i = 1; i <= (wings?.wingGuns ?? 0); i++) {
      for (const d of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * size, 0.045 * size, 0.7 * size, 8), weap?.shot === 'seeker' ? glowMat : dark);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(d * (wingSpread * 0.55 + i * 0.12 * size), -0.02 * size, 0.5 * size);
        ship.add(bar);
      }
    }

    // Thrusters at the tail (-Z): nozzle + emissive plume.
    const flames: THREE.Mesh[] = [];
    const nThr = shape === 'titan' || shape === 'juggernaut' ? 3 : 2;
    for (let i = 0; i < nThr; i++) {
      const ox = (i - (nThr - 1) / 2) * 0.34 * size;
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * size, 0.1 * size, 0.28 * size, 12), dark);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(ox, 0, -len * 0.42);
      ship.add(nozzle);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13 * size, 0.85 * size, 12), glowMat.clone());
      flame.rotation.x = Math.PI / 2;        // point -Z
      flame.position.set(ox, 0, -len * 0.62);
      ship.add(flame);
      flames.push(flame);
    }

    // Nose weapon barrel.
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * size, 0.08 * size, 0.55 * size, 10), weap?.rarity === 'legendary' ? glowMat : dark);
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 0, len * 0.6);
    ship.add(gun);

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
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      el.removeChild(renderer.domElement);
    };
  }, [craft.frame, craft.thrusters, craft.wings, craft.weapon, craft.color]);

  return <div ref={mount} className={className} />;
}
