/**
 * src/components/map/quality.ts
 * ---------------------------------------------------------------------------
 * Render-quality tiers for the WebGL stage. The scene starts at a tier picked
 * from the device (screen size, CPU cores, touch/mobile UA), then
 * <PerformanceMonitor> in GlobeOverlay steps it down when the frame rate falls
 * under ~50 fps and back up (never above the starting tier) when there is
 * headroom, keeping weak devices above 30 fps and capable ones at 60.
 * ---------------------------------------------------------------------------
 */

export type QualityTier = 0 | 1 | 2; // low · medium · high

export interface QualitySettings {
  readonly label: 'low' | 'medium' | 'high';
  /** Max device-pixel-ratio for the canvas. */
  readonly dpr: number;
  /** How many orbiting craft to render (priority order, see AlienFleet). */
  readonly craft: number;
  readonly stars: number;
  readonly dust: number;
  /** Planet sphere segments. */
  readonly segments: number;
  /** Full post stack (chromatic aberration + film grain) vs bloom + vignette only. */
  readonly fullPost: boolean;
  /** Large background mothership + waving hero alien. */
  readonly setPieces: boolean;
}

export const QUALITY: Record<QualityTier, QualitySettings> = {
  0: { label: 'low', dpr: 1, craft: 7, stars: 1800, dust: 120, segments: 64, fullPost: false, setPieces: false },
  1: { label: 'medium', dpr: 1.5, craft: 13, stars: 3500, dust: 260, segments: 96, fullPost: false, setPieces: true },
  2: { label: 'high', dpr: 2, craft: 21, stars: 6000, dust: 500, segments: 128, fullPost: true, setPieces: true },
};

/**
 * Best-guess starting tier for this device (client only; SSR gets "medium").
 * `?quality=low|medium|high` forces (and locks) a tier.
 */
export function initialQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 1;
  // Manual override for testing: ?quality=low|medium|high
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'low') return 0;
  if (forced === 'medium') return 1;
  if (forced === 'high') return 2;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent);
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  if (small || cores <= 4 || memory <= 4) return 0;
  if (mobile || cores <= 6) return 1;
  return 2;
}

/** True when the tier was forced via `?quality=`, adaptive stepping is then off. */
export function qualityLocked(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('quality');
}
