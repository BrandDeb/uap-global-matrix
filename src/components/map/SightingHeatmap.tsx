'use client';

/**
 * src/components/map/SightingHeatmap.tsx
 * Density layer: every sighting stamps a soft blob into an equirectangular
 * canvas (lng → x, lat → y, the same mapping as the Earth textures), the
 * accumulated intensity is colorized violet → teal → white, and the result is
 * wrapped on a shell just above the globe with additive blending. Lives inside
 * the Earth mesh, so it rotates with it.
 */

import { useEffect, useMemo } from 'react';
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three';
import { GLOBE_RADIUS } from '@/lib/geo';

const TW = 1024;
const TH = 512;

function ramp(t: number): [number, number, number] {
  // 0 → transparent violet, 0.5 → teal, 1 → white-hot
  const stops: [number, [number, number, number]][] = [
    [0, [90, 40, 200]],
    [0.45, [165, 139, 255]],
    [0.7, [94, 255, 216]],
    [1, [255, 255, 255]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (t <= b) {
      const k = (t - a) / (b - a);
      return [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k];
    }
  }
  return [255, 255, 255];
}

export default function SightingHeatmap({ points }: { points: readonly { latitude: number; longitude: number }[] }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH;
    const ctx = c.getContext('2d')!;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of points) {
      const x = ((p.longitude + 180) / 360) * TW;
      const y = ((90 - p.latitude) / 180) * TH;
      const r = 20;
      for (const dx of [-TW, 0, TW]) {
        // wrap blobs across the dateline
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.14)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
      }
    }
    // colorize accumulated intensity
    const img = ctx.getImageData(0, 0, TW, TH);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = d[i + 3] / 255; // accumulated density
      if (v <= 0) {
        d[i + 3] = 0;
        continue;
      }
      const [r, g, b] = ramp(Math.min(1, v * 1.6));
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = Math.min(210, v * 340);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.putImageData(img, 0, 0);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [points]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh scale={1.008} raycast={() => null}>
      <sphereGeometry args={[GLOBE_RADIUS, 96, 64]} />
      <meshBasicMaterial map={texture} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
