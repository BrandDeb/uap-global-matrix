/**
 * src/components/arcade/GravityJanitor.ts — "GRAVITY JANITOR"
 * ---------------------------------------------------------------------------
 * Asteroids-style inertia shooter with its own physics:
 *   - A black hole sits in the middle of the screen. Its gravity bends
 *     EVERYTHING — your ship, the junk, and your own plasma bolts (curve your
 *     shots around it like a pro).
 *   - Shooting junk splits it (big → medium → small).
 *   - TRACTOR: hold E / Shift (or right side tap) to grab the nearest small
 *     chunk, swing it around, release to fling it. Junk you fling INTO the
 *     black hole is "properly disposed": ×3 points and a shockwave.
 *   - Anything the hole eats on its own grows it a little. Don't feed it.
 *   - Screen wraps at the edges.
 * Controls: ←/→ rotate, ↑ thrust, Space fire, E/Shift tractor.
 * Pointer: ship turns toward the pointer; hold to thrust + auto-fire.
 * ---------------------------------------------------------------------------
 */

import { xenoAudio } from '@/components/landing/audio';
import { Fx, H, Starfield, W, dist2, glow, loadBest, rand, saveBest, wrap, type Game, type HudState, type Input } from './engine';

const CX = W / 2;
const CY = H / 2;
const G = 90000; // gravity strength

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
interface Junk extends Body {
  r: number;
  rot: number;
  vr: number;
  verts: number[];
  flung: boolean;
  hue: number;
}
interface Bolt extends Body {
  life: number;
}

function makeJunk(x: number, y: number, r: number): Junk {
  const n = 9;
  return {
    x,
    y,
    vx: rand(-60, 60),
    vy: rand(-60, 60),
    r,
    rot: 0,
    vr: rand(-1.5, 1.5),
    verts: Array.from({ length: n }, () => rand(0.7, 1.15)),
    flung: false,
    hue: [190, 270, 320, 45][Math.floor(Math.random() * 4)],
  };
}

export class GravityJanitor implements Game {
  readonly id = 'gravity-janitor';
  hud: HudState = { phase: 'title', score: 0, best: 0, lives: 3, level: 1, meter: 0, meterLabel: 'HOLE MASS' };
  private ship = { x: 160, y: 160, vx: 0, vy: 0, a: 0 };
  private junk: Junk[] = [];
  private bolts: Bolt[] = [];
  private grabbed: Junk | null = null;
  private holeR = 22;
  private fireCd = 0;
  private invuln = 0;
  private t = 0;
  private wavePause = 0;
  private fx = new Fx();
  private stars = new Starfield(150);

  constructor() {
    this.hud.best = loadBest(this.id);
  }

  start() {
    this.hud = { ...this.hud, phase: 'playing', score: 0, lives: 3, level: 1, meter: 0, message: undefined };
    this.holeR = 22;
    this.respawn();
    this.wave();
  }

  private respawn() {
    this.ship = { x: 140, y: 140, vx: 60, vy: -20, a: 0 };
    this.invuln = 2;
    this.grabbed = null;
  }

  private wave() {
    const n = 3 + (this.hud.level ?? 1);
    this.junk = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const j = makeJunk(CX + Math.cos(a) * 260, CY + Math.sin(a) * 220, 42);
      // start in a rough orbit so the field swirls
      const sp = 150;
      j.vx = -Math.sin(a) * sp;
      j.vy = Math.cos(a) * sp;
      this.junk.push(j);
    }
  }

  private gravity(b: Body, dt: number, scale = 1) {
    const dx = CX - b.x;
    const dy = CY - b.y;
    const d2 = Math.max(dx * dx + dy * dy, 900);
    const f = (G * scale * (this.holeR / 22)) / d2;
    const d = Math.sqrt(d2);
    b.vx += (dx / d) * f * dt;
    b.vy += (dy / d) * f * dt;
  }

  update(dt: number, input: Input) {
    this.t += dt;
    this.stars.update(dt, -6, 3);
    this.fx.update(dt);
    if (this.hud.phase !== 'playing') {
      if (input.pressed.has(' ') || input.pressed.has('Enter') || input.pressed.has('pointer')) this.start();
      return;
    }
    const k = input.keys;
    const s = this.ship;

    // --- steer
    let thrust = k.has('ArrowUp') || k.has('w');
    if (k.has('ArrowLeft') || k.has('a')) s.a -= 4 * dt;
    if (k.has('ArrowRight') || k.has('d')) s.a += 4 * dt;
    let fire = k.has(' ');
    if (input.pointer.active && !k.has('ArrowLeft') && !k.has('ArrowRight')) {
      const want = Math.atan2(input.pointer.y - s.y, input.pointer.x - s.x);
      let diff = want - s.a;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      s.a += Math.max(-5 * dt, Math.min(5 * dt, diff));
      if (input.pointer.down) {
        thrust = true;
        fire = true;
      }
    }
    if (thrust) {
      s.vx += Math.cos(s.a) * 300 * dt;
      s.vy += Math.sin(s.a) * 300 * dt;
      if (Math.random() < 0.6) this.fx.burst(s.x - Math.cos(s.a) * 14, s.y - Math.sin(s.a) * 14, '#ff8a3d', 1, 80, 3);
    }
    this.gravity(s, dt, 0.7);
    s.vx *= 1 - dt * 0.15;
    s.vy *= 1 - dt * 0.15;
    s.x = wrap(s.x + s.vx * dt, W);
    s.y = wrap(s.y + s.vy * dt, H);

    // --- fire
    this.fireCd -= dt;
    if (fire && this.fireCd <= 0) {
      this.bolts.push({ x: s.x + Math.cos(s.a) * 16, y: s.y + Math.sin(s.a) * 16, vx: s.vx + Math.cos(s.a) * 520, vy: s.vy + Math.sin(s.a) * 520, life: 1.6 });
      this.fireCd = 0.2;
      xenoAudio?.blip(0.7);
    }

    // --- tractor
    const tractor = k.has('e') || k.has('Shift');
    if (tractor && !this.grabbed) {
      let best: Junk | null = null;
      let bd = 160 * 160;
      for (const j of this.junk) {
        if (j.r > 16) continue;
        const d = dist2(j.x, j.y, s.x, s.y);
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      if (best) {
        this.grabbed = best;
        xenoAudio?.blip(0.2);
      }
    }
    if (this.grabbed) {
      const j = this.grabbed;
      const tx = s.x + Math.cos(s.a) * 40;
      const ty = s.y + Math.sin(s.a) * 40;
      j.vx += (tx - j.x) * 18 * dt;
      j.vy += (ty - j.y) * 18 * dt;
      j.vx *= 1 - dt * 4;
      j.vy *= 1 - dt * 4;
      if (!tractor || !this.junk.includes(j)) {
        // fling!
        j.vx = s.vx + Math.cos(s.a) * 480;
        j.vy = s.vy + Math.sin(s.a) * 480;
        j.flung = true;
        this.grabbed = null;
        xenoAudio?.whoosh();
      }
    }

    // --- junk physics + black hole
    const eaten: Junk[] = [];
    for (const j of this.junk) {
      if (j !== this.grabbed) this.gravity(j, dt);
      j.x = wrap(j.x + j.vx * dt, W);
      j.y = wrap(j.y + j.vy * dt, H);
      j.rot += j.vr * dt;
      if (dist2(j.x, j.y, CX, CY) < (this.holeR + j.r * 0.3) ** 2) eaten.push(j);
    }
    for (const j of eaten) {
      this.junk.splice(this.junk.indexOf(j), 1);
      if (this.grabbed === j) this.grabbed = null;
      if (j.flung) {
        const pts = Math.round((60 - j.r) * 3) * (this.hud.level ?? 1);
        this.hud.score += pts;
        this.fx.float(CX, CY - 50, `PROPER DISPOSAL +${pts}`, '#ffd36b');
        this.fx.burst(CX, CY, '#ffd36b', 30, 300);
        // shockwave pushes everything outward
        for (const o of this.junk) {
          const dx = o.x - CX;
          const dy = o.y - CY;
          const d = Math.hypot(dx, dy) || 1;
          o.vx += (dx / d) * 160;
          o.vy += (dy / d) * 160;
        }
        xenoAudio?.boop();
      } else {
        this.holeR = Math.min(70, this.holeR + j.r * 0.08);
        this.fx.burst(CX, CY, '#a58bff', 12, 160);
      }
    }
    this.hud.meter = (this.holeR - 22) / 48;
    this.hud.meterLabel = this.holeR > 55 ? 'HOLE CRITICAL' : 'HOLE MASS';

    // --- bolts
    for (const b of this.bolts) {
      this.gravity(b, dt, 1.4);
      b.x = wrap(b.x + b.vx * dt, W);
      b.y = wrap(b.y + b.vy * dt, H);
      b.life -= dt;
      if (dist2(b.x, b.y, CX, CY) < this.holeR ** 2) b.life = 0;
      for (const j of this.junk) {
        if (b.life <= 0) break;
        if (dist2(b.x, b.y, j.x, j.y) < j.r * j.r) {
          b.life = 0;
          this.split(j);
        }
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0);

    // --- ship collisions
    this.invuln -= dt;
    if (this.invuln <= 0) {
      const hitHole = dist2(s.x, s.y, CX, CY) < (this.holeR + 4) ** 2;
      const hitJunk = this.junk.some((j) => j !== this.grabbed && dist2(s.x, s.y, j.x, j.y) < (j.r + 10) ** 2);
      if (hitHole || hitJunk) {
        this.hud.lives = (this.hud.lives ?? 1) - 1;
        this.fx.burst(s.x, s.y, '#5effd8', 50, 360, 4);
        this.fx.float(s.x, s.y - 30, hitHole ? 'SPAGHETTIFIED' : 'BONK', '#ff5ec8');
        this.fx.shake = 16;
        xenoAudio?.moo();
        this.respawn();
      }
    }

    // --- waves / end
    if (this.junk.length === 0) {
      this.wavePause += dt;
      if (this.wavePause > 1.2) {
        this.wavePause = 0;
        this.hud.level = (this.hud.level ?? 1) + 1;
        this.holeR = Math.max(22, this.holeR - 6);
        this.fx.float(CX, CY + 60, `SECTOR ${this.hud.level} — CLEAN IT UP`, '#5effd8');
        this.wave();
      }
    }
    if ((this.hud.lives ?? 0) <= 0 || this.holeR >= 70) {
      this.hud.phase = 'over';
      this.hud.message = this.holeR >= 70 ? 'The black hole got too fat. It ate the galaxy. And you.' : 'Shift over. The junk won this round.';
      this.hud.best = saveBest(this.id, this.hud.score);
    }
  }

  private split(j: Junk) {
    this.junk.splice(this.junk.indexOf(j), 1);
    if (this.grabbed === j) this.grabbed = null;
    const lvl = this.hud.level ?? 1;
    this.hud.score += (j.r > 30 ? 20 : j.r > 16 ? 50 : 100) * lvl;
    this.fx.burst(j.x, j.y, `hsl(${j.hue} 90% 65%)`, 14, 220);
    xenoAudio?.blip(0.35);
    if (j.r > 16) {
      for (let i = 0; i < 2; i++) {
        const c = makeJunk(j.x, j.y, j.r * 0.55);
        c.vx = j.vx + rand(-120, 120);
        c.vy = j.vy + rand(-120, 120);
        c.hue = j.hue;
        this.junk.push(c);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.fx.applyShake(ctx);
    this.stars.draw(ctx, '#020108', '#0b0620');
    // black hole: accretion disk + event horizon + lensing ring
    const r = this.holeR;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(this.t * 0.6);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ['rgba(255,138,61,0.55)', 'rgba(255,94,200,0.4)', 'rgba(165,139,255,0.3)'][i];
      ctx.lineWidth = 6 - i * 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (2.2 + i * 0.6), r * (0.7 + i * 0.2), 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    glow(ctx, '#ff8a3d', 40, () => {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(CX, CY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,140,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    // junk
    for (const j of this.junk) {
      ctx.save();
      ctx.translate(j.x, j.y);
      ctx.rotate(j.rot);
      ctx.strokeStyle = `hsl(${j.hue} 90% 65%)`;
      ctx.fillStyle = `hsla(${j.hue} 60% 25% / 0.6)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      j.verts.forEach((v, i) => {
        const a = (i / j.verts.length) * Math.PI * 2;
        const px = Math.cos(a) * j.r * v;
        const py = Math.sin(a) * j.r * v;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // tractor tether
    if (this.grabbed) {
      ctx.strokeStyle = 'rgba(94,255,216,0.7)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this.ship.x, this.ship.y);
      ctx.lineTo(this.grabbed.x, this.grabbed.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // bolts
    for (const b of this.bolts) {
      glow(ctx, '#5effd8', 10, () => {
        ctx.fillStyle = '#cffff3';
        ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
      });
    }
    // ship: a tiny saucer-wedge
    const s = this.ship;
    if (this.hud.phase === 'playing' && (this.invuln <= 0 || Math.floor(this.t * 12) % 2 === 0)) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      glow(ctx, '#5effd8', 14, () => {
        ctx.strokeStyle = '#5effd8';
        ctx.fillStyle = '#0b2a22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.fillStyle = '#7dffb0';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.fx.draw(ctx);
    ctx.restore();
  }
}
