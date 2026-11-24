/**
 * Shared shader clock. One `{ value }` object referenced as `uTime` by every
 * xeno material, advanced once per frame by <TimeDriver/> inside the Canvas.
 * Living at module scope keeps hook-returned materials immutable for React.
 */
import { useFrame } from '@react-three/fiber';

export const SHADER_TIME = { value: 0 };

export function TimeDriver() {
  useFrame(({ clock }) => {
    SHADER_TIME.value = clock.getElapsedTime();
  });
  return null;
}
