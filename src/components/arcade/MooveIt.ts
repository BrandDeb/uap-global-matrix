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
 *   - Five escalating nights, each with a points quota to hit before dawn:
 *     Quiet Pasture, Farmers Market, Thunderstorm (wind gusts), Military
 *     Response (sweeping searchlights), Area 51 Rodeo. Then endless overtime.
 *   - Power-up crates: beam them up for Coolant (instant cool) or Mega Beam.
 * ---------------------------------------------------------------------------
 */

import { xenoAudio } from '@/components/landing/audio';
import { Fx, H, Starfield, W, clamp, drawSaucer, glow, loadBest, rand, saveBest, streakWord, type Game, type HudState, type Input } from './engine';

const GROUND = H - 70;

interface Night { name: string; quota: number; time: number; farmer: number; gold: number; crate: number; wind: number; lights: number }
const NIGHTS: Night[] = [
  { name: 'Quiet Pasture', quota: 1500, time: 60, farmer: 0.08, gold: 0.05, crate: 0.05, wind: 0, lights: 0 },
  { name: 'Farmers Market', quota: 3500, time: 65, farmer: 0.24, gold: 0.06, crate: 0.06, wind: 0, lights: 0 },
  { name: 'Thunderstorm', quota: 5500, time: 70, farmer: 0.14, gold: 0.07, crate: 0.07, wind: 1, lights: 0 },
  { name: 'Military Response', quota: 8000, time: 75, farmer: 0.14, gold: 0.08, crate: 0.07, wind: 0, lights: 2 },
  { name: 'Area 51 Rodeo', quota: 12000, time: 80, farmer: 0.2, gold: 0.12, crate: 0.08, wind: 1, lights: 2 },
];
const nightFor = (n: number): Night => {
  if (n <= NIGHTS.length) return NIGHTS[n - 1];
  const last = NIGHTS[NIGHTS.length - 1];
  return { ...last, name: `Overtime ${n - NIGHTS.length}`, quota: last.quota + (n - NIGHTS.length) * 4000, lights: 3 };
};

type Kind = 'calf' | 'cow' | 'bull' | 'gold' | 'farmer' | 'crate';
const KINDS: Record<Kind, { w: number; lift: number; pts: number }> = {
  calf: { w: 30, lift: 240, pts: 50 },
  cow: { w: 44, lift: 160, pts: 100 },
  bull: { w: 56, lift: 90, pts: 250 },
  gold: { w: 44, lift: 150, pts: 1000 },
  farmer: { w: 22, lift: 200, pts: 400 },
  crate: { w: 26, lift: 260, pts: 0 },
};

interface Critter {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  lifted: boolean;
  spin: number;
  cooldown: number; // farmers: time to next flash
  power?: 'cool' | 'mega';
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
  private night = 1;
  private cfg: Night = NIGHTS[0];
  private time = NIGHTS[0].time;
  private nightScore = 0;
  private between = 0;
  private mega = 0;
  private spotted = 0;
  private invuln = 0;
  private lightning = 0;
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
    this.ship.x = W / 2;
    this.beginNight(1);
  }

  private beginNight(n: number) {
    this.night = n;
    this.cfg = nightFor(n);
    this.time = this.cfg.time;
    this.nightScore = 0;
    this.critters = [];
    this.flashes = [];
    this.heat = 0;
    this.jammed = 0;
    this.combo = 0;
    this.mega = 0;
    this.spotted = 0;
    this.between = 2.2;
    this.hud.level = n;
    this.fx.hype(`NIGHT ${n}: ${this.cfg.name.toUpperCase()}`, '#5effd8');
    for (let i = 0; i < 5; i++) this.spawn();
  }

  /** Searchlight angle (radians from vertical) for light i at time t. */
  private lightAngle(i: number) {
    return Math.sin(this.t * (0.6 + i * 0.25) + i * 2) * 0.75;
  }
  private lightBase(i: number) {
    return ((i + 1) / (this.cfg.lights + 1)) * W;
  }

  private spawn() {
    const r = Math.random();
    const { gold, farmer, crate } = this.cfg;
    const kind: Kind = r < crate ? 'crate' : r < crate + gold ? 'gold' : r < crate + gold + farmer ? 'farmer' : r < 0.5 ? 'calf' : r < 0.82 ? 'cow' : 'bull';
    const fromLeft = Math.random() < 0.5;
    this.critters.push({
      kind,
      x: fromLeft ? -40 : W + 40,
      y: GROUND,
      vx: (fromLeft ? 1 : -1) * rand(20, kind === 'gold' ? 140 : 60),
      lifted: false,
      spin: 0,
      cooldown: rand(1.5, 3),
      power: kind === 'crate' ? (Math.random() < 0.5 ? 'cool' : 'mega') : undefined,
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
    if (this.between > 0) {
      this.between -= dt;
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.mega = Math.max(0, this.mega - dt);

    // --- ship: keys or pointer steering
    const k = input.keys;
    let ax = 0;
    if (k.has('ArrowLeft') || k.has('a')) ax -= 1;
    if (k.has('ArrowRight') || k.has('d')) ax += 1;
    if (input.pointer.active && ax === 0) ax = clamp((input.pointer.x - this.ship.x) / 80, -1, 1);
    this.ship.vx += ax * 1400 * dt;
    if (this.cfg.wind) this.ship.vx += Math.sin(this.t * 0.55) * Math.sin(this.t * 1.7 + 1) * 900 * dt;
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
    const rush = 1 - this.time / this.cfg.time;
    if (this.spawnT <= 0 && this.critters.length < 9 + Math.floor(rush * 5)) {
      this.spawn();
      this.spawnT = rand(0.8, 1.8) * (1 - rush * 0.55);
    }
    const wide = this.mega > 0 ? 1.8 : 1;
    const beamHalf = (y: number) => (18 + ((y - this.ship.y) / (GROUND - this.ship.y)) * 70) * wide;
    for (const c of this.critters) {
      const inBeam = this.beam && Math.abs(c.x - this.ship.x) < beamHalf(c.y);
      if (inBeam) {
        c.lifted = true;
        c.y -= KINDS[c.kind].lift * (this.mega > 0 ? 1.6 : 1) * dt;
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
        if (c.kind === 'crate') {
          if (c.power === 'cool') {
            this.heat = 0;
            this.jammed = 0;
            this.fx.hype('❄ COOLANT', '#38e8ff');
          } else {
            this.mega = 6;
            this.fx.hype('⚡ MEGA BEAM', '#a58bff');
          }
          this.fx.burst(this.ship.x, this.ship.y + 10, '#38e8ff', 20, 220);
          xenoAudio?.chime();
          continue;
        }
        this.combo = this.comboT > 0 ? this.combo + 1 : 1;
        this.comboT = 2.2;
        const pts = KINDS[c.kind].pts * this.combo;
        this.hud.score += pts;
        this.nightScore += pts;
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
        if (this.invuln > 0) continue;
        this.invuln = 1;
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

    // --- searchlights: linger in a cone and you get spotted
    let lit = false;
    for (let i = 0; i < this.cfg.lights; i++) {
      const bx = this.lightBase(i);
      const ang = Math.atan2(this.ship.x - bx, GROUND - this.ship.y);
      if (Math.abs(ang - this.lightAngle(i)) < 0.11) lit = true;
    }
    this.spotted = clamp(this.spotted + (lit ? dt * 1.4 : -dt), 0, 1);
    if (this.spotted >= 1 && this.invuln <= 0) {
      this.spotted = 0;
      this.invuln = 1.5;
      this.hud.lives = (this.hud.lives ?? 1) - 1;
      this.fx.shake = 12;
      this.fx.flash('#fff6c0', 1.2);
      this.fx.hype('🔦 SPOTTED BY THE MILITARY', '#fff6c0');
      this.combo = 0;
    }

    // --- storm lightning (purely atmospheric, briefly lights the field)
    if (this.cfg.wind) {
      this.lightning -= dt;
      if (this.lightning <= 0) {
        this.lightning = rand(4, 9);
        this.fx.flash('#cfe2ff', 0.5);
      }
    }

    // --- clock + quota
    this.time -= dt;
    if (this.nightScore >= this.cfg.quota && this.time > 0 && !this.cleared) {
      this.cleared = true;
      this.fx.hype('QUOTA MET · KEEP BEAMING', '#ffd36b');
      xenoAudio?.chime();
    }
    if ((this.hud.lives ?? 0) <= 0) {
      this.end('You made the evening news.');
    } else if (this.time <= 0) {
      if (this.nightScore >= this.cfg.quota) {
        const bonus = (this.hud.lives ?? 0) * 500 * this.night;
        this.hud.score += bonus;
        this.fx.float(W / 2, H / 2, `NIGHT CLEARED +${bonus}`, '#ffd36b');
        this.hud.lives = Math.min(5, (this.hud.lives ?? 0) + 1);
        this.cleared = false;
        this.beginNight(this.night + 1);
      } else {
        this.end(`Dawn broke ${(this.cfg.quota - this.nightScore).toLocaleString()} points short of the Night ${this.night} quota.`);
      }
    }
    this.hud.goal = `${this.cfg.name} · ${Math.min(this.nightScore, this.cfg.quota).toLocaleString()}/${this.cfg.quota.toLocaleString()} · ${Math.max(0, Math.ceil(this.time))}s`;
  }

  private cleared = false;

  private end(message: string) {
    this.hud.phase = 'over';
    this.hud.message = `${message} Reached Night ${this.night}.`;
    this.hud.best = saveBest(this.id, this.hud.score);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.fx.applyShake(ctx);
    // sky fades toward dawn
    const dawn = 1 - clamp(this.time / this.cfg.time, 0, 1);
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
    // searchlights
    for (let i = 0; i < this.cfg.lights; i++) {
      const bx = this.lightBase(i);
      const a = this.lightAngle(i);
      const len = GROUND + 40;
      ctx.fillStyle = `rgba(255,246,192,${0.1 + this.spotted * 0.15})`;
      ctx.beginPath();
      ctx.moveTo(bx, GROUND);
      ctx.lineTo(bx + Math.sin(a - 0.11) * len, GROUND - Math.cos(a - 0.11) * len);
      ctx.lineTo(bx + Math.sin(a + 0.11) * len, GROUND - Math.cos(a + 0.11) * len);
      ctx.fill();
      ctx.fillStyle = '#3a4a3a';
      ctx.fillRect(bx - 12, GROUND - 6, 24, 10);
    }
    // rain
    if (this.cfg.wind) {
      ctx.strokeStyle = 'rgba(160,190,255,0.25)';
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = ((i * 137 + this.t * 300) % (W + 100)) - 50;
        const y = (i * 53 + this.t * 700) % H;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 18);
      }
      ctx.stroke();
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
    if (!(this.invuln > 0 && Math.floor(this.t * 12) % 2 === 0))
      drawSaucer(ctx, this.ship.x, this.ship.y, 96, this.t, this.jammed > 0 ? '#ff5ec8' : this.mega > 0 ? '#a58bff' : '#5effd8');
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
    if (c.kind === 'crate') {
      const col = c.power === 'cool' ? '#38e8ff' : '#a58bff';
      glow(ctx, col, 14, () => {
        ctx.fillStyle = '#2b2440';
        ctx.fillRect(-13, -26, 26, 26);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.strokeRect(-13, -26, 26, 26);
      });
      ctx.scale(dir, 1);
      ctx.fillStyle = col;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.power === 'cool' ? '❄' : '⚡', 0, -7);
    } else if (c.kind === 'farmer') {
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
