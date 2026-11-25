/**
 * src/components/arcade/MooveIt.ts, "MOO-VE IT"
 * ---------------------------------------------------------------------------
 * A cow-abduction game with its own rules:
 *   - Hold the beam (Space / click / touch-hold) to lift whatever is below.
 *   - The beam HEATS while on; overheat and it jams for 2s. Release to cool.
 *   - Cows have weight: calves rise fast, bulls are slow; the GOLDEN cow is
 *     worth 10× but panics and runs.
 *   - Farmers fire flashlight "photo flashes" at you, get snapped 3 times and
 *     you're on the news (game over). Beam a farmer up to stop him (big bonus).
 *   - Abducting in quick succession builds a combo multiplier.
 *   - 90-second night; score as much as you can before dawn.
 * ---------------------------------------------------------------------------
 */

import { xenoAudio } from '@/components/landing/audio';
import { Fx, H, Starfield, W, clamp, drawSaucer, glow, loadBest, rand, saveBest, streakWord, type Game, type HudState, type Input } from './engine';

const GROUND = H - 70;
const NIGHT = 90;

type Kind = 'calf' | 'cow' | 'bull' | 'gold' | 'farmer';
const KINDS: Record<Kind, { w: number; lift: number; pts: number }> = {
  calf: { w: 30, lift: 240, pts: 50 },
  cow: { w: 44, lift: 160, pts: 100 },
  bull: { w: 56, lift: 90, pts: 250 },
  gold: { w: 44, lift: 150, pts: 1000 },
  farmer: { w: 22, lift: 200, pts: 400 },
};

interface Critter {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  lifted: boolean;
  spin: number;
  cooldown: number; // farmers: time to next flash
}

interface Flash {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class MooveIt implements Game {
  readonly id = 'moove-it';
  hud: HudState = { phase: 'title', score: 0, best: 0, lives: 3, meter: 0, meterLabel: 'BEAM HEAT' };
  private ship = { x: W / 2, vx: 0, y: 120 };
  private beam = false;
  private heat = 0;
  private jammed = 0;
  private critters: Critter[] = [];
  private flashes: Flash[] = [];
  private time = NIGHT;
  private combo = 0;
  private comboT = 0;
  private spawnT = 0;
  private t = 0;
  private fx = new Fx();
  private stars = new Starfield(120);
  private hills: number[] = Array.from({ length: 13 }, () => rand(20, 70));

  constructor() {
    this.hud.best = loadBest(this.id);
  }

  start() {
    this.hud = { ...this.hud, phase: 'playing', score: 0, lives: 3, meter: 0, message: undefined };
    this.critters = [];
    this.flashes = [];
    this.time = NIGHT;
    this.heat = 0;
    this.jammed = 0;
    this.combo = 0;
    this.ship.x = W / 2;
    for (let i = 0; i < 5; i++) this.spawn();
  }

  private spawn() {
    const r = Math.random();
    const kind: Kind = r < 0.06 ? 'gold' : r < 0.2 ? 'farmer' : r < 0.45 ? 'calf' : r < 0.8 ? 'cow' : 'bull';
    const fromLeft = Math.random() < 0.5;
    this.critters.push({
      kind,
      x: fromLeft ? -40 : W + 40,
      y: GROUND,
      vx: (fromLeft ? 1 : -1) * rand(20, kind === 'gold' ? 140 : 60),
      lifted: false,
      spin: 0,
      cooldown: rand(1.5, 3),
    });
  }

  update(dt: number, input: Input) {
    this.t += dt;
    this.stars.update(dt, 4, 0);
    this.fx.update(dt);
    if (this.hud.phase !== 'playing') {
      if (input.pressed.has(' ') || input.pressed.has('Enter') || (input.pointer.down && input.pressed.has('pointer'))) this.start();
      return;
    }
    if (this.fx.frozen(dt)) return;

    // --- ship: keys or pointer steering
    const k = input.keys;
    let ax = 0;
    if (k.has('ArrowLeft') || k.has('a')) ax -= 1;
    if (k.has('ArrowRight') || k.has('d')) ax += 1;
    if (input.pointer.active && ax === 0) ax = clamp((input.pointer.x - this.ship.x) / 80, -1, 1);
    this.ship.vx += ax * 1400 * dt;
    this.ship.vx *= 1 - dt * 4;
    this.ship.x = clamp(this.ship.x + this.ship.vx * dt, 40, W - 40);
    this.ship.y = 120 + Math.sin(this.t * 2) * 6;

    // --- beam + heat
    const wants = k.has(' ') || input.pointer.down;
    this.jammed = Math.max(0, this.jammed - dt);
    this.beam = wants && this.jammed <= 0;
    this.heat = clamp(this.heat + (this.beam ? dt * 0.32 : -dt * 0.45), 0, 1);
    if (this.heat >= 1 && this.jammed <= 0) {
      this.jammed = 2;
      this.fx.float(this.ship.x, this.ship.y - 40, 'OVERHEAT!', '#ff5ec8');
      xenoAudio?.whoosh();
    }
    this.hud.meter = this.jammed > 0 ? 1 : this.heat;
    this.hud.meterLabel = this.jammed > 0 ? 'JAMMED' : 'BEAM HEAT';

    // --- critters
    this.spawnT -= dt;
    // the night gets busier (and the farmers angrier) as dawn approaches
    const rush = 1 - this.time / NIGHT;
    if (this.spawnT <= 0 && this.critters.length < 9 + Math.floor(rush * 5)) {
      this.spawn();
      this.spawnT = rand(0.8, 1.8) * (1 - rush * 0.55);
    }
    const beamHalf = (y: number) => 18 + ((y - this.ship.y) / (GROUND - this.ship.y)) * 70;
    for (const c of this.critters) {
      const inBeam = this.beam && Math.abs(c.x - this.ship.x) < beamHalf(c.y);
      if (inBeam) {
        c.lifted = true;
        c.y -= KINDS[c.kind].lift * dt;
        c.x += (this.ship.x - c.x) * dt * 3;
        c.spin += dt * 4;
      } else if (c.y < GROUND) {
        c.y = Math.min(GROUND, c.y + 420 * dt); // dropped!
        if (c.y >= GROUND && c.lifted) {
          c.lifted = false;
          this.fx.burst(c.x, GROUND, '#c9b17a', 10, 120);
        }
      } else {
        c.x += c.vx * dt;
        if (c.kind === 'gold' && Math.abs(c.x - this.ship.x) < 120) c.vx = Math.sign(c.x - this.ship.x || 1) * 170; // panic
        if (c.kind === 'farmer') {
          c.cooldown -= dt;
          if (c.cooldown <= 0) {
            c.cooldown = rand(1.6, 3.2);
            const dx = this.ship.x - c.x;
            const dy = this.ship.y - (c.y - 30);
            const d = Math.hypot(dx, dy) || 1;
            this.flashes.push({ x: c.x, y: c.y - 30, vx: (dx / d) * 360, vy: (dy / d) * 360 });
          }
        }
      }
      // abducted!
      if (c.y < this.ship.y + 26) {
        c.x = -999;
        this.combo = this.comboT > 0 ? this.combo + 1 : 1;
        this.comboT = 2.2;
        const pts = KINDS[c.kind].pts * this.combo;
        this.hud.score += pts;
        this.fx.burst(this.ship.x, this.ship.y + 10, c.kind === 'gold' ? '#ffd36b' : '#5effd8', 26, 260);
        this.fx.float(this.ship.x, this.ship.y + 50, `+${pts}${this.combo > 1 ? `  x${this.combo}` : ''}`, c.kind === 'gold' ? '#ffd36b' : '#5effd8');
        if (c.kind === 'farmer') xenoAudio?.boop();
        else xenoAudio?.moo();
        if (c.kind === 'gold') {
          this.fx.hitstop(0.14);
          this.fx.flash('#ffd36b');
          this.fx.hype('GOLDEN MOO', '#ffd36b');
          this.fx.shake = 10;
        } else if (c.kind === 'farmer') {
          this.fx.hype('FARMER YOINKED', '#ff5ec8');
          this.fx.hitstop(0.08);
        } else {
          const w = streakWord(this.combo);
          if (w) {
            this.fx.hype(w, '#5effd8');
            this.fx.hitstop(0.06);
            this.fx.flash('#5effd8', 0.6);
          }
        }
      }
    }
    this.critters = this.critters.filter((c) => c.x > -60 && c.x < W + 60);
    this.comboT -= dt;

    // --- camera flashes
    for (const f of this.flashes) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (Math.abs(f.x - this.ship.x) < 40 && Math.abs(f.y - this.ship.y) < 18) {
        f.y = -999;
        this.hud.lives = (this.hud.lives ?? 1) - 1;
        this.fx.shake = 12;
        this.fx.burst(this.ship.x, this.ship.y, '#ffffff', 30, 300);
        this.fx.float(this.ship.x, this.ship.y - 40, 'SNAPPED!', '#ffffff');
        this.fx.flash('#ffffff', 1.4);
        this.fx.hype('📸 CAUGHT ON CAMERA', '#ffffff');
        this.combo = 0;
        xenoAudio?.blip(0.1);
      }
    }
    this.flashes = this.flashes.filter((f) => f.y > -20 && f.x > -20 && f.x < W + 20);

    // --- clock
    this.time -= dt;
    if ((this.hud.lives ?? 0) <= 0 || this.time <= 0) {
      this.hud.phase = 'over';
      this.hud.message = (this.hud.lives ?? 0) <= 0 ? 'You made the evening news.' : 'Dawn broke. The herd is safe… for now.';
      this.hud.best = saveBest(this.id, this.hud.score);
    }
    this.hud.level = Math.ceil(this.time);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.fx.applyShake(ctx);
    // sky fades toward dawn
    const dawn = 1 - clamp(this.time / NIGHT, 0, 1);
    this.stars.draw(ctx, '#05030f', dawn > 0.8 ? '#3a1a3f' : '#0d0726');
    // moon
    glow(ctx, '#fff6d6', 40, () => {
      ctx.fillStyle = '#fff6d6';
      ctx.beginPath();
      ctx.arc(W - 120, 90, 34, 0, Math.PI * 2);
      ctx.fill();
    });
    // hills + field
    ctx.fillStyle = '#0e1a12';
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    this.hills.forEach((h, i) => ctx.lineTo((i / (this.hills.length - 1)) * W, GROUND - h));
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = '#16261a';
    ctx.fillRect(0, GROUND + 8, W, H);
    // beam
    if (this.beam) {
      const g = ctx.createLinearGradient(0, this.ship.y, 0, GROUND);
      g.addColorStop(0, 'rgba(94,255,216,0.55)');
      g.addColorStop(1, 'rgba(94,255,216,0.08)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(this.ship.x - 16, this.ship.y + 10);
      ctx.lineTo(this.ship.x + 16, this.ship.y + 10);
      ctx.lineTo(this.ship.x + 88, GROUND + 10);
      ctx.lineTo(this.ship.x - 88, GROUND + 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(94,255,216,0.25)';
      for (let i = 0; i < 5; i++) {
        const y = this.ship.y + 20 + (((this.t * 120 + i * 60) % (GROUND - this.ship.y)));
        const half = 18 + ((y - this.ship.y) / (GROUND - this.ship.y)) * 70;
        ctx.beginPath();
        ctx.moveTo(this.ship.x - half, y);
        ctx.lineTo(this.ship.x + half, y);
        ctx.stroke();
      }
    }
    // critters
    for (const c of this.critters) this.drawCritter(ctx, c);
    // flashes
    for (const f of this.flashes) {
      glow(ctx, '#ffffff', 16, () => {
        ctx.fillStyle = '#fffbe0';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    drawSaucer(ctx, this.ship.x, this.ship.y, 96, this.t, this.jammed > 0 ? '#ff5ec8' : '#5effd8');
    this.fx.draw(ctx);
    ctx.restore();
    this.fx.drawOverlay(ctx);
  }

  private drawCritter(ctx: CanvasRenderingContext2D, c: Critter) {
    const s = KINDS[c.kind].w;
    ctx.save();
    ctx.translate(c.x, c.y);
    if (c.lifted) ctx.rotate(Math.sin(c.spin) * 0.6);
    const dir = c.vx >= 0 ? 1 : -1;
    ctx.scale(dir, 1);
    if (c.kind === 'farmer') {
      ctx.fillStyle = '#c98b5b';
      ctx.fillRect(-5, -38, 10, 10); // head
      ctx.fillStyle = '#d9b44a';
      ctx.fillRect(-9, -42, 18, 4); // hat brim
      ctx.fillStyle = '#3d6bd9';
      ctx.fillRect(-7, -28, 14, 18); // overalls
      ctx.fillStyle = '#2a2a33';
      ctx.fillRect(-6, -10, 4, 10);
      ctx.fillRect(2, -10, 4, 10);
      ctx.fillStyle = '#fffbe0';
      ctx.fillRect(7, -26, 8, 3); // flashlight
    } else {
      const body = c.kind === 'gold' ? '#ffd36b' : c.kind === 'bull' ? '#5b4636' : '#f4f1ea';
      const spot = c.kind === 'gold' ? '#fff3b0' : '#17151c';
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.45, s * 0.5, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, -s * 0.5, s * 0.14, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.fillRect(s * 0.38, -s * 0.72, s * 0.28, s * 0.26); // head
      ctx.fillStyle = '#ff9cc2';
      ctx.fillRect(s * 0.58, -s * 0.6, s * 0.1, s * 0.12); // snout
      ctx.fillStyle = '#fff';
      ctx.fillRect(s * 0.47, -s * 0.68, s * 0.08, s * 0.08); // googly eye
      ctx.fillStyle = '#000';
      ctx.fillRect(s * 0.5, -s * 0.66, s * 0.04, s * 0.04);
      if (c.kind === 'bull') {
        ctx.fillStyle = '#e9d6a7';
        ctx.fillRect(s * 0.4, -s * 0.8, s * 0.06, s * 0.1);
      }
      ctx.fillStyle = body;
      const legKick = c.lifted ? Math.sin(c.spin * 3) * 4 : Math.sin(c.x * 0.2) * 2;
      for (const lx of [-0.3, -0.1, 0.15, 0.32]) ctx.fillRect(s * lx, -s * 0.22 + legKick * (lx > 0 ? 1 : -1), s * 0.08, s * 0.22);
      if (c.kind === 'gold') glow(ctx, '#ffd36b', 20, () => ctx.fillRect(-1, -s, 2, 2));
    }
    ctx.restore();
  }
}
