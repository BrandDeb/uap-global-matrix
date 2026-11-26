/**
 * src/components/arcade/StarForge.ts, "STAR FORGE"
 * ---------------------------------------------------------------------------
 * A vertical shooter you fly with the craft you built in the Hangar. Your
 * parts set HP, speed, fire rate, damage, shot pattern and wing guns. Waves
 * escalate; every 5th wave is a boss. Enemies drop scrap, and sometimes a
 * PART CRATE — collect it to discover a new part for the builder. Endless.
 * ---------------------------------------------------------------------------
 */
import { xenoAudio } from '@/components/landing/audio';
import { Fx, H, Starfield, W, clamp, drawSaucer, glow, loadBest, rand, saveBest, type Game, type HudState, type Input } from './engine';
import { loadoutStats, drawShip, rollPart, RARITY, type Craft } from '@/lib/craft';
import { addScrap, findPart } from '@/lib/hangarStore';

interface Bullet { x: number; y: number; vx: number; vy: number; dmg: number; homing?: boolean; pierce?: boolean; }
interface Enemy { x: number; y: number; vx: number; vy: number; hp: number; max: number; r: number; kind: string; t: number; cd: number; boss?: boolean; }
interface Mote { x: number; y: number; vy: number; kind: 'scrap' | 'heal' | 'part'; part?: string; color?: string; }

export class StarForge implements Game {
  readonly id = 'star-forge';
  hud: HudState = { phase: 'title', score: 0, best: 0, meter: 1, meterLabel: 'HULL' };
  private s = loadoutStats({ frame: 'f-falcon', thrusters: 't-ion', wings: 'w-stub', weapon: 'g-blaster', color: '#5effd8' });
  private ship = { x: W / 2, y: H - 90 };
  private hp = 4;
  private bullets: Bullet[] = [];
  private foes: Enemy[] = [];
  private eb: Bullet[] = [];
  private motes: Mote[] = [];
  private wave = 0;
  private toSpawn = 0;
  private spawnT = 0;
  private fireT = 0;
  private inv = 0;
  private t = 0;
  private fx = new Fx();
  private stars = new Starfield(150);
  earned = 0;
  found: string[] = [];

  constructor(private craft: Craft) {
    this.hud.best = loadBest(this.id);
    this.s = loadoutStats(craft);
  }

  start() {
    this.s = loadoutStats(this.craft);
    this.hp = this.s.hp;
    this.hud = { ...this.hud, phase: 'playing', score: 0, meter: 1, message: undefined };
    this.ship = { x: W / 2, y: H - 90 };
    this.bullets = [];
    this.foes = [];
    this.eb = [];
    this.motes = [];
    this.wave = 0;
    this.earned = 0;
    this.found = [];
    this.inv = 1;
    this.nextWave();
  }

  private nextWave() {
    this.wave++;
    this.hud.level = this.wave;
    if (this.wave % 5 === 0) {
      const hp = 60 + this.wave * 20;
      this.foes.push({ x: W / 2, y: -80, vx: 0, vy: 0, hp, max: hp, r: 52, kind: 'boss', t: 0, cd: 1, boss: true });
      this.toSpawn = 0;
      this.fx.hype(`WAVE ${this.wave}: WARLORD`, '#ff5ec8');
    } else {
      this.toSpawn = 4 + this.wave;
      this.spawnT = 0;
      this.fx.hype(`WAVE ${this.wave}`, '#5effd8');
    }
  }

  private spawn() {
    const r = Math.random();
    const kind = r < 0.45 ? 'grunt' : r < 0.7 ? 'weaver' : r < 0.88 ? 'turret' : 'diver';
    const hp = (kind === 'turret' ? 4 : kind === 'diver' ? 2 : 3) + Math.floor(this.wave / 4);
    this.foes.push({ x: rand(60, W - 60), y: -40, vx: rand(-30, 30), vy: rand(50, 80) + this.wave * 3, hp, max: hp, r: 18, kind, t: rand(0, 6), cd: rand(1, 2.5) });
  }

  update(dt: number, input: Input) {
    this.t += dt;
    this.stars.update(dt, 0, 120);
    this.fx.update(dt);
    if (this.hud.phase !== 'playing') {
      if (input.pressed.has(' ') || input.pressed.has('Enter') || (input.pointer.down && input.pressed.has('pointer'))) this.start();
      return;
    }
    if (this.fx.frozen(dt)) return;
    this.inv = Math.max(0, this.inv - dt);

    const k = input.keys;
    let ax = 0;
    let ay = 0;
    if (k.has('ArrowLeft') || k.has('a')) ax -= 1;
    if (k.has('ArrowRight') || k.has('d')) ax += 1;
    if (k.has('ArrowUp') || k.has('w')) ay -= 1;
    if (k.has('ArrowDown') || k.has('s')) ay += 1;
    if (input.pointer.active && !ax && !ay) {
      ax = clamp((input.pointer.x - this.ship.x) / 40, -1, 1);
      ay = clamp((input.pointer.y - 50 - this.ship.y) / 40, -1, 1);
    }
    this.ship.x = clamp(this.ship.x + ax * this.s.speed * dt, 30, W - 30);
    this.ship.y = clamp(this.ship.y + ay * this.s.speed * dt, 60, H - 40);

    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = 1 / this.s.fireRate;
      this.shoot();
      xenoAudio?.blip(0.12);
    }

    for (const b of this.bullets) {
      if (b.homing) {
        const tgt = this.foes.filter((f) => f.y > 0).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
        if (tgt) {
          const a = Math.atan2(tgt.y - b.y, tgt.x - b.x);
          const sp = Math.hypot(b.vx, b.vy) || 480;
          b.vx += Math.cos(a) * 1400 * dt;
          b.vy += Math.sin(a) * 1400 * dt;
          const n = Math.hypot(b.vx, b.vy);
          b.vx = (b.vx / n) * sp;
          b.vy = (b.vy / n) * sp;
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.bullets = this.bullets.filter((b) => b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20);

    if (this.toSpawn > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawn();
        this.toSpawn--;
        this.spawnT = rand(0.3, 0.8);
      }
    }
    if (this.toSpawn === 0 && this.foes.length === 0) this.nextWave();

    for (const f of this.foes) {
      f.t += dt;
      if (f.boss) {
        f.y = Math.min(95, f.y + 60 * dt);
        f.x = W / 2 + Math.sin(f.t * 0.8) * (W / 2 - 90);
        f.cd -= dt;
        if (f.cd <= 0) {
          f.cd = 0.55;
          for (let i = -2; i <= 2; i++) this.eb.push({ x: f.x, y: f.y + 40, vx: i * 55, vy: 185, dmg: 1 });
        }
      } else {
        f.y += f.vy * dt;
        if (f.kind === 'weaver') f.x += Math.sin(f.t * 3) * 90 * dt;
        else f.x += f.vx * dt;
        if (f.kind === 'diver' && f.y < this.ship.y) f.x += Math.sign(this.ship.x - f.x) * 60 * dt;
        if (f.kind === 'turret') {
          f.cd -= dt;
          if (f.cd <= 0 && f.y > 0 && f.y < H - 150) {
            f.cd = rand(1.4, 2.4);
            const a = Math.atan2(this.ship.y - f.y, this.ship.x - f.x);
            this.eb.push({ x: f.x, y: f.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: 1 });
          }
        }
        if (f.x < 20 || f.x > W - 20) f.vx *= -1;
      }
    }

    for (const b of this.bullets) {
      for (const f of this.foes) {
        if (Math.hypot(b.x - f.x, b.y - f.y) < f.r) {
          f.hp -= b.dmg;
          if (!b.pierce) b.y = -999;
          this.fx.burst(b.x, b.y, this.craft.color, 4, 120);
          if (f.hp <= 0) this.kill(f);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.y > -900);
    this.foes = this.foes.filter((f) => f.hp > 0 && f.y < H + 50);

    for (const b of this.eb) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (this.inv <= 0 && Math.hypot(b.x - this.ship.x, b.y - this.ship.y) < 15) {
        b.y = H + 999;
        this.damage();
      }
    }
    this.eb = this.eb.filter((b) => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
    if (this.inv <= 0) {
      for (const f of this.foes) {
        if (Math.hypot(f.x - this.ship.x, f.y - this.ship.y) < f.r + 12) {
          this.damage();
          if (!f.boss) f.hp = 0;
          break;
        }
      }
    }

    for (const m of this.motes) {
      // magnet pull
      const d = Math.hypot(m.x - this.ship.x, m.y - this.ship.y);
      if (d < 120) {
        m.x += (this.ship.x - m.x) * 6 * dt;
        m.y += (this.ship.y - m.y) * 6 * dt;
      } else m.y += m.vy * dt;
      if (d < 26) {
        m.y = H + 999;
        if (m.kind === 'scrap') {
          this.earned += 5;
          this.hud.score += 20;
          addScrap(5);
        } else if (m.kind === 'heal') {
          this.hp = Math.min(this.s.hp, this.hp + 1);
          xenoAudio?.chime();
        } else if (m.kind === 'part' && m.part) {
          const isNew = findPart(m.part);
          if (isNew) this.found.push(m.part);
          this.fx.hype(isNew ? 'NEW PART FOUND' : 'PART (owned)', m.color ?? '#ffd23f');
          this.fx.flash(m.color ?? '#ffd23f', 0.8);
          xenoAudio?.chime();
        }
      }
    }
    this.motes = this.motes.filter((m) => m.y < H + 10);

    this.hud.meter = this.hp / this.s.hp;
    this.hud.goal = `Wave ${this.wave} · ${this.earned} scrap${this.found.length ? ` · ${this.found.length} parts` : ''}`;
  }

  private shoot() {
    const y = this.ship.y - 24;
    const dmg = this.s.damage;
    const push = (vx: number, vy: number, extra: Partial<Bullet> = {}) => this.bullets.push({ x: this.ship.x, y, vx, vy, dmg, ...extra });
    switch (this.s.shot) {
      case 'twin':
        this.bullets.push({ x: this.ship.x - 12, y, vx: 0, vy: -640, dmg }, { x: this.ship.x + 12, y, vx: 0, vy: -640, dmg });
        break;
      case 'spread':
        for (const a of [-0.28, 0, 0.28]) push(Math.sin(a) * 480, -Math.cos(a) * 600);
        break;
      case 'wave':
        push(Math.sin(this.t * 10) * 200, -560);
        break;
      case 'rail':
        push(0, -1000, { pierce: true, dmg: dmg });
        break;
      case 'seeker':
        push(rand(-60, 60), -400, { homing: true });
        break;
      case 'prism':
        for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) push(Math.sin(a) * 440, -Math.cos(a) * 600);
        break;
      default:
        push(0, -660);
    }
    // wing guns add outer bolts
    for (let i = 1; i <= this.s.wingGuns; i++) {
      const wx = 16 + i * 10;
      this.bullets.push({ x: this.ship.x - wx, y: y + 10, vx: 0, vy: -620, dmg: dmg * 0.7 }, { x: this.ship.x + wx, y: y + 10, vx: 0, vy: -620, dmg: dmg * 0.7 });
    }
  }

  private kill(f: Enemy) {
    this.hud.score += f.boss ? 2000 : 100;
    this.fx.burst(f.x, f.y, '#ffd23f', f.boss ? 44 : 14, 260);
    if (f.boss) {
      this.fx.hype('WARLORD DOWN', '#ffd23f');
      this.fx.flash('#fff', 1.2);
      this.fx.shake = 16;
    }
    const scrapDrops = f.boss ? 10 : Math.random() < 0.5 ? 1 : 0;
    for (let i = 0; i < scrapDrops; i++) this.motes.push({ x: f.x + rand(-20, 20), y: f.y, vy: rand(60, 110), kind: 'scrap' });
    // part crate: bosses always, grunts rarely
    if (f.boss || Math.random() < 0.03) {
      const p = rollPart(Math.random);
      this.motes.push({ x: f.x, y: f.y, vy: 70, kind: 'part', part: p.id, color: RARITY[p.rarity].color });
    }
    if (f.boss && Math.random() < 0.8) this.motes.push({ x: f.x - 30, y: f.y, vy: 80, kind: 'heal' });
    xenoAudio?.boop();
  }

  private damage() {
    this.hp--;
    this.inv = 1.2;
    this.fx.shake = 10;
    this.fx.flash('#ff5ec8', 1);
    xenoAudio?.blip(0.1);
    if (this.hp <= 0) {
      this.hud.phase = 'over';
      const extra = this.found.length ? ` Found ${this.found.length} new part${this.found.length === 1 ? '' : 's'}.` : '';
      this.hud.message = `Reached wave ${this.wave}. ${this.earned} scrap banked.${extra}`;
      this.hud.best = saveBest(this.id, this.hud.score);
      try {
        addScrap(0, this.wave);
      } catch {
        /* standalone */
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.fx.applyShake(ctx);
    this.stars.draw(ctx, '#03030c', '#0a0a22');
    for (const m of this.motes) {
      const col = m.kind === 'scrap' ? '#ffd23f' : m.kind === 'heal' ? '#5effd8' : (m.color ?? '#fff');
      glow(ctx, col, m.kind === 'part' ? 16 : 10, () => {
        ctx.fillStyle = col;
        if (m.kind === 'part') {
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(this.t * 2);
          ctx.fillRect(-7, -7, 14, 14);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    ctx.fillStyle = this.craft.color;
    for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, b.pierce ? 22 : 12);
    ctx.fillStyle = '#ff5ec8';
    for (const b of this.eb) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const f of this.foes) {
      if (f.boss) {
        glow(ctx, '#ff5ec8', 24, () => drawSaucer(ctx, f.x, f.y, 110, this.t, '#ff5ec8'));
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(W / 2 - 200, 18, 400, 8);
        ctx.fillStyle = '#ff5ec8';
        ctx.fillRect(W / 2 - 200, 18, 400 * (f.hp / f.max), 8);
      } else {
        const c = f.kind === 'turret' ? '#ffd23f' : f.kind === 'diver' ? '#ff7a5c' : f.kind === 'weaver' ? '#a58bff' : '#8af2ff';
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(0, f.r);
        ctx.lineTo(f.r * 0.8, -f.r * 0.6);
        ctx.lineTo(0, -f.r * 0.3);
        ctx.lineTo(-f.r * 0.8, -f.r * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0b0b1a';
        ctx.beginPath();
        ctx.arc(0, f.r * 0.1, f.r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    if (!(this.inv > 0 && Math.floor(this.t * 12) % 2 === 0)) drawShip(ctx, this.ship.x, this.ship.y, 22, this.craft, this.t);
    this.fx.draw(ctx);
    ctx.restore();
    this.fx.drawOverlay(ctx);
  }
}
