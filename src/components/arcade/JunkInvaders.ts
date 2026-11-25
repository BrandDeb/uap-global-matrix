/**
 * src/components/arcade/JunkInvaders.ts — "JUNK INVADERS"
 * ---------------------------------------------------------------------------
 * Fixed-shooter with the roles flipped: humanity's orbital junk (satellites,
 * selfie-drones, floating space-cars) is invading YOUR moon. You fly the
 * saucer along the moon's surface.
 *
 * Twists:
 *   - RECYCLE: hold the beam (Shift / X, or keep your finger down) to catch the
 *     junk the invaders drop. Each catch charges a PIERCING super-shot (fires
 *     automatically on the next shot) that rips through a whole column.
 *   - Crop-circle shields slowly regrow between hits.
 *   - Every 3rd wave the "Station" boss drifts across shedding drones.
 *   - The formation speeds up as it thins (and as the soundtrack would).
 * Controls: ←/→ or A/D (or pointer x) to move, Space / click to fire.
 * ---------------------------------------------------------------------------
 */

import { xenoAudio } from '@/components/landing/audio';
import { Fx, H, Starfield, W, clamp, drawSaucer, glow, loadBest, rand, saveBest, type Game, type HudState, type Input } from './engine';

const FLOOR = H - 60;
type EKind = 'sat' | 'drone' | 'car';

interface Enemy {
  kind: EKind;
  x: number;
  y: number;
  alive: boolean;
  hp: number;
}
interface Shot {
  x: number;
  y: number;
  vy: number;
  pierce: boolean;
}
interface Bomb {
  x: number;
  y: number;
  vy: number;
  spin: number;
}
interface Shield {
  x: number;
  hp: number;
}

const PTS: Record<EKind, number> = { sat: 30, drone: 20, car: 50 };

export class JunkInvaders implements Game {
  readonly id = 'junk-invaders';
  hud: HudState = { phase: 'title', score: 0, best: 0, lives: 3, level: 1, meter: 0, meterLabel: 'RECYCLE CHARGE' };
  private px = W / 2;
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private bombs: Bomb[] = [];
  private shields: Shield[] = [];
  private dir = 1;
  private march = 0;
  private fireCd = 0;
  private charge = 0;
  private boss: { x: number; hp: number; dropT: number } | null = null;
  private invuln = 0;
  private beaming = false;
  private t = 0;
  private fx = new Fx();
  private stars = new Starfield(160);

  constructor() {
    this.hud.best = loadBest(this.id);
  }

  start() {
    this.hud = { ...this.hud, phase: 'playing', score: 0, lives: 3, level: 1, meter: 0, message: undefined };
    this.shields = [0.2, 0.4, 0.6, 0.8].map((f) => ({ x: W * f, hp: 6 }));
    this.charge = 0;
    this.wave();
  }

  private wave() {
    const lvl = this.hud.level ?? 1;
    this.enemies = [];
    this.shots = [];
    this.bombs = [];
    this.dir = 1;
    const rows: EKind[] = ['car', 'sat', 'sat', 'drone', 'drone'];
    rows.forEach((kind, r) => {
      for (let c = 0; c < 10; c++) {
        this.enemies.push({ kind, x: 140 + c * 62, y: 80 + r * 46 + Math.min(lvl - 1, 4) * 12, alive: true, hp: kind === 'car' ? 2 : 1 });
      }
    });
    this.boss = lvl % 3 === 0 ? { x: -120, hp: 18 + lvl * 2, dropT: 1 } : null;
  }

  update(dt: number, input: Input) {
    this.t += dt;
    this.stars.update(dt, 0, 18);
    this.fx.update(dt);
    if (this.hud.phase !== 'playing') {
      if (input.pressed.has(' ') || input.pressed.has('Enter') || input.pressed.has('pointer')) this.start();
      return;
    }
    const k = input.keys;
    // --- move
    let ax = 0;
    if (k.has('ArrowLeft') || k.has('a')) ax -= 1;
    if (k.has('ArrowRight') || k.has('d')) ax += 1;
    if (ax !== 0) this.px += ax * 420 * dt;
    else if (input.pointer.active) this.px += clamp(input.pointer.x - this.px, -420 * dt, 420 * dt);
    this.px = clamp(this.px, 40, W - 40);

    // --- fire
    this.fireCd -= dt;
    const firing = k.has(' ') || (input.pointer.down && !k.has('Shift'));
    if (firing && this.fireCd <= 0) {
      const pierce = this.charge >= 1;
      if (pierce) this.charge = 0;
      this.shots.push({ x: this.px, y: FLOOR - 30, vy: pierce ? -900 : -620, pierce });
      this.fireCd = 0.28;
      xenoAudio?.blip(pierce ? 1 : 0.65);
    }
    const beaming = k.has('Shift') || k.has('x') || input.pointer.down;
    this.beaming = beaming;
    this.hud.meter = this.charge;
    this.hud.meterLabel = this.charge >= 1 ? 'SUPER-SHOT READY' : 'RECYCLE CHARGE';

    // --- formation march
    const alive = this.enemies.filter((e) => e.alive);
    const lvl = this.hud.level ?? 1;
    const speed = (26 + lvl * 6) * (1 + (50 - alive.length) / 22);
    let edge = false;
    for (const e of alive) {
      e.x += this.dir * speed * dt;
      if (e.x < 30 || e.x > W - 30) edge = true;
    }
    if (edge) {
      this.dir *= -1;
      for (const e of alive) e.y += 16;
    }
    this.march += dt;
    // bombs from random bottom-most enemies
    if (alive.length && Math.random() < dt * (0.9 + lvl * 0.25)) {
      const e = alive[Math.floor(Math.random() * alive.length)];
      this.bombs.push({ x: e.x, y: e.y + 12, vy: rand(150, 220 + lvl * 15), spin: 0 });
    }
    // boss
    if (this.boss) {
      this.boss.x += 70 * dt;
      this.boss.dropT -= dt;
      if (this.boss.dropT <= 0) {
        this.boss.dropT = 0.7;
        this.bombs.push({ x: this.boss.x, y: 56, vy: 260, spin: 0 });
      }
      if (this.boss.x > W + 140) this.boss.x = -140;
    }

    // --- shots
    for (const s of this.shots) {
      s.y += s.vy * dt;
      for (const e of alive) {
        if (!e.alive || Math.abs(s.x - e.x) > 22 || Math.abs(s.y - e.y) > 16) continue;
        e.hp -= s.pierce ? 3 : 1;
        if (!s.pierce) s.y = -999;
        if (e.hp <= 0) {
          e.alive = false;
          this.hud.score += PTS[e.kind] * lvl;
          this.fx.burst(e.x, e.y, e.kind === 'car' ? '#ff5ec8' : e.kind === 'sat' ? '#38e8ff' : '#ffd36b', 18, 240);
          this.fx.shake = 3;
          xenoAudio?.blip(0.3);
        }
      }
      if (this.boss && Math.abs(s.x - this.boss.x) < 70 && Math.abs(s.y - 50) < 24) {
        this.boss.hp -= s.pierce ? 4 : 1;
        if (!s.pierce) s.y = -999;
        this.fx.burst(s.x, 50, '#a58bff', 6, 120);
        if (this.boss.hp <= 0) {
          this.fx.burst(this.boss.x, 50, '#ffffff', 80, 420, 5);
          this.fx.float(this.boss.x, 80, `STATION DOWN +${1500 * lvl}`, '#ffd36b');
          this.hud.score += 1500 * lvl;
          this.fx.shake = 14;
          this.boss = null;
          xenoAudio?.boop();
        }
      }
      // shields block your own normal shots too (classic)
    }
    this.shots = this.shots.filter((s) => s.y > -20);

    // --- bombs (junk) — catch with the beam, or they chip shields / hit you
    for (const b of this.bombs) {
      b.y += b.vy * dt;
      b.spin += dt * 6;
      if (beaming && b.y > FLOOR - 180 && Math.abs(b.x - this.px) < 46) {
        b.y = 9999;
        this.charge = Math.min(1, this.charge + 0.34);
        this.fx.burst(this.px, FLOOR - 40, '#5effd8', 10, 140);
        this.fx.float(this.px, FLOOR - 70, 'RECYCLED ♻', '#5effd8');
        this.hud.score += 10;
        continue;
      }
      for (const sh of this.shields) {
        if (sh.hp > 0 && Math.abs(b.x - sh.x) < 44 && b.y > FLOOR - 70 && b.y < FLOOR - 40) {
          sh.hp -= 1;
          b.y = 9999;
          this.fx.burst(b.x, FLOOR - 55, '#c9b17a', 8, 100);
        }
      }
      if (this.invuln <= 0 && b.y > FLOOR - 26 && b.y < FLOOR && Math.abs(b.x - this.px) < 40) {
        b.y = 9999;
        this.hit();
      }
    }
    this.bombs = this.bombs.filter((b) => b.y < H);
    this.invuln -= dt;
    // shields regrow slowly
    for (const sh of this.shields) sh.hp = Math.min(6, sh.hp + dt * 0.12);

    // --- wave state
    if (alive.length === 0 && !this.boss) {
      this.hud.level = lvl + 1;
      this.fx.float(W / 2, H / 2, `WAVE ${lvl + 1}`, '#ffd36b');
      this.wave();
    }
    if (alive.some((e) => e.y > FLOOR - 60)) {
      this.hud.lives = 0;
    }
    if ((this.hud.lives ?? 0) <= 0) {
      this.hud.phase = 'over';
      this.hud.message = 'Your moon is now a landfill. Humans: 1, Aliens: 0.';
      this.hud.best = saveBest(this.id, this.hud.score);
    }
  }

  private hit() {
    this.hud.lives = (this.hud.lives ?? 1) - 1;
    this.invuln = 1.6;
    this.fx.shake = 14;
    this.fx.burst(this.px, FLOOR - 10, '#ff5ec8', 40, 320);
    xenoAudio?.moo();
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.fx.applyShake(ctx);
    this.stars.draw(ctx, '#03020a', '#120a2a');
    // Earth looming in the corner (where the junk comes from)
    glow(ctx, '#38e8ff', 50, () => {
      const g = ctx.createRadialGradient(W - 80, -40, 10, W - 80, -40, 180);
      g.addColorStop(0, '#2d7bd9');
      g.addColorStop(1, '#0a1f4a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(W - 80, -40, 160, 0, Math.PI * 2);
      ctx.fill();
    });
    // moon surface
    ctx.fillStyle = '#2b2840';
    ctx.fillRect(0, FLOOR + 10, W, H);
    ctx.fillStyle = '#3a3656';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 97) % W, FLOOR + 30 + (i % 3) * 10, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // crop-circle shields
    for (const sh of this.shields) {
      if (sh.hp <= 0.2) continue;
      ctx.save();
      ctx.globalAlpha = clamp(sh.hp / 6, 0.15, 1);
      ctx.strokeStyle = '#5effd8';
      ctx.lineWidth = 3;
      glow(ctx, '#5effd8', 12, () => {
        ctx.beginPath();
        ctx.arc(sh.x, FLOOR - 55, 38, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sh.x, FLOOR - 55, 22, Math.PI, 0);
        ctx.stroke();
      });
      ctx.restore();
    }
    // enemies
    const bob = Math.sin(this.march * 8) * 2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      ctx.save();
      ctx.translate(e.x, e.y + bob);
      if (e.kind === 'sat') {
        ctx.fillStyle = '#c9ccd6';
        ctx.fillRect(-7, -7, 14, 14);
        ctx.fillStyle = '#2d7bd9';
        ctx.fillRect(-24, -4, 14, 8);
        ctx.fillRect(10, -4, 14, 8);
        ctx.fillStyle = '#38e8ff';
        ctx.fillRect(-2, -12, 4, 5);
      } else if (e.kind === 'drone') {
        ctx.fillStyle = '#ffd36b';
        ctx.fillRect(-8, -4, 16, 8);
        ctx.fillStyle = '#e6e6f0';
        const prop = Math.sin(this.t * 40) * 8;
        ctx.fillRect(-14 - prop / 2, -8, 10 + prop, 2);
        ctx.fillRect(4 - prop / 2, -8, 10 + prop, 2);
        ctx.fillStyle = '#ff2d55';
        ctx.fillRect(-1, 1, 2, 2); // recording light
      } else {
        // floating space-car
        ctx.fillStyle = e.hp > 1 ? '#ff5ec8' : '#a8336f';
        ctx.fillRect(-18, -5, 36, 10);
        ctx.fillRect(-9, -11, 18, 6);
        ctx.fillStyle = '#0b0b12';
        ctx.fillRect(-14, 4, 7, 5);
        ctx.fillRect(7, 4, 7, 5);
        ctx.fillStyle = '#ffd36b';
        ctx.fillRect(16, -3, 3, 3);
      }
      ctx.restore();
    }
    // boss station
    if (this.boss) {
      const b = this.boss;
      glow(ctx, '#a58bff', 20, () => {
        ctx.fillStyle = '#8d93a3';
        ctx.fillRect(b.x - 60, 44, 120, 14);
        ctx.fillRect(b.x - 10, 26, 20, 50);
        ctx.fillStyle = '#2d7bd9';
        ctx.fillRect(b.x - 110, 40, 46, 22);
        ctx.fillRect(b.x + 64, 40, 46, 22);
      });
      ctx.fillStyle = '#ff5ec8';
      ctx.fillRect(b.x - 60, 84, 120 * clamp(b.hp / 30, 0, 1), 4);
    }
    // bombs (junk chunks)
    for (const b of this.bombs) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.spin);
      ctx.fillStyle = '#c9b17a';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#ff8a3d';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    // shots
    for (const s of this.shots) {
      glow(ctx, s.pierce ? '#ffd36b' : '#5effd8', 14, () => {
        ctx.fillStyle = s.pierce ? '#ffd36b' : '#5effd8';
        ctx.fillRect(s.x - (s.pierce ? 4 : 2), s.y - (s.pierce ? 18 : 10), s.pierce ? 8 : 4, s.pierce ? 36 : 20);
      });
    }
    // recycle beam (points up from the saucer)
    if (this.beaming && this.hud.phase === 'playing') {
      const g = ctx.createLinearGradient(0, FLOOR - 200, 0, FLOOR - 20);
      g.addColorStop(0, 'rgba(94,255,216,0)');
      g.addColorStop(1, 'rgba(94,255,216,0.35)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(this.px - 12, FLOOR - 24);
      ctx.lineTo(this.px + 12, FLOOR - 24);
      ctx.lineTo(this.px + 46, FLOOR - 190);
      ctx.lineTo(this.px - 46, FLOOR - 190);
      ctx.fill();
    }
    // player
    if (this.hud.phase === 'playing' && (this.invuln <= 0 || Math.floor(this.t * 12) % 2 === 0)) {
      drawSaucer(ctx, this.px, FLOOR - 16, 72, this.t, this.charge >= 1 ? '#ffd36b' : '#5effd8');
    }
    this.fx.draw(ctx);
    ctx.restore();
  }
}
