/**
 * src/components/landing/landingStore.ts
 * ---------------------------------------------------------------------------
 * Tiny mutable store shared between the DOM (GSAP ScrollTriggers, pointer
 * listeners) and the WebGL scene (read every frame in useFrame). Kept outside
 * React state on purpose: these values change every frame and must not
 * trigger re-renders.
 * ---------------------------------------------------------------------------
 */
export const landing = {
  /** Pointer in normalized device coords (-1..1). */
  mouse: { x: 0, y: 0 },
  /** 0 → hero in view, 1 → scrolled past the hero. */
  heroOut: 0,
  /** 0..1 how much of the field-guide showcase is active. */
  showcase: 0,
  /** Index of the craft featured in the field guide. */
  craftIndex: 0,
  /** 0..1 final call-to-action reached. */
  cta: 0,
  /** Bumped when the visitor clicks the saucer (extra-goofy abduction). */
  boops: 0,
};
