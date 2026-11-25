/**
 * Shared shader clock. One `{ value }` object referenced as `uTime` by every
 * xeno material, advanced once per frame by <TimeDriver/> inside the Canvas.
 * Accumulates clamped frame deltas instead of THREE.Clock (deprecated in r184)
 * so animations never jump after shader compilation or background tab switches.
 */
import { useFrame } from '@react-three/fiber';

export const SHADER_TIME = { value: 0 };

export function TimeDriver() {
  useFrame((_, delta) => {
    SHADER_TIME.value += Math.min(delta, 0.1);
  });
  return null;
}
