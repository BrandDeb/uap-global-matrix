/**
 * src/components/arcade/engine.ts
 * ---------------------------------------------------------------------------
 * A tiny, dependency-free 2D canvas game kit shared by the three arcade games.
 *
 *   - fixed logical resolution (W×H), letterboxed to any screen
 *   - input: keyboard set + a single pointer (mouse / touch) with "down" state
 *   - helpers: particles, floating text, screen shake, parallax starfield
 *   - best scores in localStorage (best-effort, private mode safe)
 *
 * A game implements `Game`: update(dt) + draw(ctx). The <GameCanvas> React
 * component owns the loop, resize and pause-on-blur.
 * ---------------------------------------------------------------------------
 */

export const W = 960;
export const H = 600;

export type Phase = 'title' | 'playing' | 'over';

export interface HudState {
  phase: Phase;
  score: number;
  best: number;
  lives?: number;
  level?: number;
  meter?: number; // 0..1 generic gauge (beam heat, etc.)
  meterLabel?: string;
  message?: string;
  /** Short objective line under the score (e.g. quota progress). */
  goal?: string;
}

export interface Input {
  keys: Set<string>;
  pointer: { x: number; y: number; down: boolean; active: boolean };
  /** Keys pressed since last frame (edge-triggered). */
  pressed: Set<string>;
}

export interface Game {
  readonly id: string;
  hud: HudState;
  start(): void;
  update(dt: number, input: Input): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

/* --- math ------------------------------------------------------------------ */

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const wrap = (v: number, max: number) => ((v % max) + max) % max;
export const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;

/* --- best scores ------------------------------------------------------------ */

export function loadBest(id: string): number {
  try {
    return Number(localStorage.getItem(`uap-arcade-best:${id}`) ?? 0) || 0;
  } catch {
    return 0;
  }
}
export function saveBest(id: string, score: number): number {
  const best = Math.max(loadBest(id), score);
  try {
    localStorage.setItem(`uap-arcade-best:${id}`, String(best));
  } catch {
    /* private mode */
  }
  return best;
}

/* --- fx ---------------------------------------------------------------------- */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export class Fx {
  particles: Particle[] = [];
  texts: { x: number; y: number; text: string; life: number; color: string }[] = [];
  shake = 0;
  private stopT = 0;
  private flashT = 0;
  private flashColor = '#ffffff';
  private hypeText = '';
  private hypeColor = '#5effd8';
  private hypeT = 0;

  /** Freeze the world for a beat, sells big hits. */
  hitstop(seconds: number) {
    this.stopT = Math.max(this.stopT, seconds);
  }
  /** Full-screen color flash. */
  flash(color = '#ffffff', strength = 1) {
    this.flashColor = color;
    this.flashT = 0.25 * strength;
  }
  /** Big centered popping word (streaks, milestones). */
  hype(text: string, color = '#5effd8') {
    this.hypeText = text;
    this.hypeColor = color;
    this.hypeT = 1;
  }
  /** Call at the top of a game's gameplay update: true while frozen. */
  frozen(dt: number): boolean {
    if (this.stopT <= 0) return false;
    this.stopT -= dt;
    return true;
  }
  /** Screen-space overlays (flash + hype word); draw last, unshaken. */
  drawOverlay(ctx: CanvasRenderingContext2D) {
    if (this.flashT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, this.flashT * 2.2);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (this.hypeT > 0) {
      const p = 1 - this.hypeT; // 0 → 1
      const scale = p < 0.15 ? 0.4 + (p / 0.15) * 0.9 : 1.3 - Math.min(0.3, (p - 0.15) * 0.6);
      ctx.save();
      ctx.translate(W / 2, H * 0.42);
      ctx.rotate(-0.06);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.min(1, this.hypeT * 2.5);
      ctx.font = '900 64px "Unbounded", "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#05030f';
      ctx.strokeText(this.hypeText, 0, 0);
      ctx.shadowColor = this.hypeColor;
      ctx.shadowBlur = 30;
      ctx.fillStyle = this.hypeColor;
      ctx.fillText(this.hypeText, 0, 0);
      ctx.restore();
    }
  }

  burst(x: number, y: number, color: string, n = 16, speed = 220, size = 3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.3, speed);
      const max = rand(0.35, 0.9);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: max, max, color, size: rand(size * 0.5, size * 1.4) });
    }
  }

  float(x: number, y: number, text: string, color = '#5effd8') {
    this.texts.push({ x, y, text, life: 1.1, color });
  }

  update(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flashT = Math.max(0, this.flashT - dt);
    this.hypeT = Math.max(0, this.hypeT - dt * 0.9);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 2;
      p.vy *= 1 - dt * 2;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 40 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
    ctx.save();
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  /** Apply camera shake; call before drawing the world, ctx.restore() after. */
  applyShake(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
  }
}

/* --- parallax starfield ------------------------------------------------------ */

export class Starfield {
  stars: { x: number; y: number; z: number }[] = [];
  constructor(n = 140) {
    for (let i = 0; i < n; i++) this.stars.push({ x: rand(0, W), y: rand(0, H), z: rand(0.2, 1) });
  }
  update(dt: number, vx = 0, vy = 30) {
    for (const s of this.stars) {
      s.x = wrap(s.x + vx * s.z * dt, W);
      s.y = wrap(s.y + vy * s.z * dt, H);
    }
  }
  draw(ctx: CanvasRenderingContext2D, top = '#05030f', bottom = '#0d0726') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const s of this.stars) {
      ctx.globalAlpha = 0.3 + s.z * 0.7;
      ctx.fillStyle = s.z > 0.85 ? '#cffff3' : '#a9a4cc';
      const r = s.z * 1.8;
      ctx.fillRect(s.x, s.y, r, r);
    }
    ctx.globalAlpha = 1;
  }
}

/** Glow helper: draw with neon shadow. */
export function glow(ctx: CanvasRenderingContext2D, color: string, blur: number, fn: () => void) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

/** Classic saucer silhouette used by several games (center x,y; width w). */
export function drawSaucer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number, color = '#5effd8') {
  ctx.save();
  ctx.translate(x, y);
  // dome
  ctx.fillStyle = 'rgba(94,255,216,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -w * 0.12, w * 0.22, w * 0.2, 0, Math.PI, 0);
  ctx.fill();
  // tiny pilot
  ctx.fillStyle = '#7dffb0';
  ctx.beginPath();
  ctx.ellipse(0, -w * 0.16, w * 0.07, w * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#05050a';
  ctx.fillRect(-w * 0.045, -w * 0.18, w * 0.03, w * 0.02);
  ctx.fillRect(w * 0.015, -w * 0.18, w * 0.03, w * 0.02);
  // hull
  const g = ctx.createLinearGradient(0, -w * 0.1, 0, w * 0.1);
  g.addColorStop(0, '#d9dce8');
  g.addColorStop(1, '#5a6075');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.5, w * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  // rim lights
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI + t * 3;
    const lx = Math.cos(a) * w * 0.42;
    ctx.fillStyle = Math.sin(a) > 0 ? color : '#ffffff';
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(a));
    ctx.beginPath();
    ctx.arc(lx, w * 0.02, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Escalating streak callouts. Returns null when the streak isn't a milestone. */
export function streakWord(n: number): string | null {
  const words: Record<number, string> = {
    3: 'TRIPLE!',
    5: 'UNHINGED',
    8: 'COSMIC',
    12: 'ABSOLUTE UNIT',
    16: 'GALAXY BRAIN',
    20: 'TOUCH GRASS?',
  };
  return words[n] ?? (n > 20 && n % 5 === 0 ? `x${n} NO WAY` : null);
}
