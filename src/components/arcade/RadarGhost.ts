/**
 * src/components/arcade/RadarGhost.ts, "RADAR GHOST"
 * ---------------------------------------------------------------------------
 * A stealth flyer. Slip your saucer through military airspace without being
 * tracked:
 *   - Ground radars sweep rotating beams; fighter jets patrol with forward
 *     sensor cones. Every moment inside one fills your DETECTION meter.
 *     Fill it and you're TRACKED (lose a life).
 *   - Hold Space or Shift (or press the CLOAK zone on the right edge on
 *     touch screens) to go invisible. Cloak drains energy and you can't
 *     collect data while cloaked.
 *   - Grab glowing data packets for points; distance flown also scores.
 *   - Every sector is faster with more radars and jets. Reach sector 5 to
 *     earn the Radar Ghost badge.
 * ---------------------------------------------------------------------------
 */
import { xenoAudio } from '@/components/landing/audio';
import { awardBadge } from '@/lib/achievements';
import { Fx, H, Starfield, W, clamp, drawSaucer, glow, loadBest, rand, saveBest, type Game, type HudState, type Input } from './engine';

const GROUND = H - 60;
const SECTOR_LEN = 4200;

interface Radar { x: number; phase: number; speed: number; range: number }
interface Jet { x: number; y: number; vx: number; bob: number }
interface Packet { x: number; y: number; t: number }

export class RadarGhost implements Game {
  readonly id = 'radar-ghost';
  hud: HudState = { phase: 'title', score: 0, best: 0, lives: 3, meter: 1, meterLabel: 'CLOAK' };
  private ship = { x: 180, y: H / 2, vx: 0, vy: 0 };
  private scroll = 0;
  private distPts = 0;
  private speed = 150;
  private sector = 1;
  private energy = 1;
  private cloaked = false;
  private detect = 0;
  private invuln = 0;
  private radars: Radar[] = [];
  private jets: Jet[] = [];
  private packets: Packet[] = [];
  private nextSpawn = 0;
  private t = 0;
  private fx = new Fx();
  private stars = new Starfield(140);
  private hills = Array.from({ length: 40 }, () => rand(10, 70));

  constructor() {
    this.hud.best = loadBest(this.id);
  }

  start() {
    this.hud = { ...this.hud, phase: 'playing', score: 0, lives: 3, meter: 1, message: undefined };
    this.ship = { x: 180, y: H / 2, vx: 0, vy: 0 };
    this.scroll = 0;
    this.sector = 1;
    this.speed = 150;
    this.energy = 1;
    this.detect = 0;
    this.radars = [];
    this.jets = [];
    this.packets = [];
    this.nextSpawn = W;
    this.fx.hype('SECTOR 1 · STAY DARK', '#5effd8');
  }

  /** Populate the stretch of world just off the right edge. */
  private spawnAhead() {
    while (this.nextSpawn < this.scroll + W + 200) {
      const x = this.nextSpawn;
      const r = Math.random();
      const radarOdds = 0.35 + this.sector * 0.05;
      if (r < radarOdds) this.radars.push({ x, phase: rand(0, Math.PI), speed: rand(0.6, 1.1) + this.sector * 0.12, range: rand(300, 420) });
      else if (r < radarOdds + 0.15 + this.sector * 0.04) this.jets.push({ x, y: rand(80, GROUND - 160), vx: -rand(60, 120), bob: rand(0, 6) });
      for (let i = 0; i < 2; i++) this.packets.push({ x: x + rand(-80, 80), y: rand(60, GROUND - 40), t: rand(0, 6) });
      this.nextSpawn += rand(260, 420) - this.sector * 15;
    }
  }

  private radarAngle(r: Radar) {
    // sweeps back and forth across the sky (0 = straight up)
    return Math.sin(this.t * r.speed + r.phase) * 1.25;
  }

  update(dt: number, input: Input) {
    this.t += dt;
    this.fx.update(dt);
    this.stars.update(dt, -this.speed * 0.3, 0);
    if (this.hud.phase !== 'playing') {
      if (input.pressed.has(' ') || input.pressed.has('Enter') || (input.pointer.down && input.pressed.has('pointer'))) this.start();
      return;
    }
    if (this.fx.frozen(dt)) return;

    // --- movement: keys, or steer toward the pointer
    const k = input.keys;
    let ax = 0;
    let ay = 0;
    if (k.has('ArrowLeft') || k.has('a')) ax -= 1;
    if (k.has('ArrowRight') || k.has('d')) ax += 1;
    if (k.has('ArrowUp') || k.has('w')) ay -= 1;
    if (k.has('ArrowDown') || k.has('s')) ay += 1;
    const cloakZone = input.pointer.down && input.pointer.x > W - 130;
    if (input.pointer.active && !cloakZone && ax === 0 && ay === 0) {
      ax = clamp((input.pointer.x - this.ship.x) / 60, -1, 1);
      ay = clamp((input.pointer.y - this.ship.y) / 60, -1, 1);
    }
    this.ship.vx = (this.ship.vx + ax * 1600 * dt) * (1 - dt * 5);
    this.ship.vy = (this.ship.vy + ay * 1600 * dt) * (1 - dt * 5);
    this.ship.x = clamp(this.ship.x + this.ship.vx * dt, 50, W - 50);
    this.ship.y = clamp(this.ship.y + this.ship.vy * dt, 40, GROUND - 30);

    // --- cloak (Space / Shift, or hold the right-edge zone)
    const wantCloak = k.has(' ') || k.has('Shift') || cloakZone;
    this.cloaked = wantCloak && this.energy > 0.02;
    this.energy = clamp(this.energy + (this.cloaked ? -dt * 0.42 : dt * 0.18), 0, 1);
    this.hud.meter = this.energy;
    this.hud.meterLabel = this.cloaked ? 'CLOAKED' : 'CLOAK';

    // --- world scroll + sectors
    this.scroll += this.speed * dt;
    this.distPts += this.speed * dt * 0.1;
    if (this.distPts >= 1) {
      this.hud.score += Math.floor(this.distPts);
      this.distPts -= Math.floor(this.distPts);
    }
    const sector = 1 + Math.floor(this.scroll / SECTOR_LEN);
    if (sector > this.sector) {
      this.sector = sector;
      this.speed = 150 + sector * 28;
      this.hud.score += 1000 * (sector - 1);
      this.fx.hype(`SECTOR ${sector}`, '#a58bff');
      this.fx.flash('#a58bff', 0.5);
      xenoAudio?.chime();
      if (sector >= 5) awardBadge('ghost');
    }
    this.hud.level = this.sector;
    this.spawnAhead();
    const sx = (wx: number) => wx - this.scroll;

    // --- detection
    let seen = 0;
    if (!this.cloaked && this.invuln <= 0) {
      for (const r of this.radars) {
        const x = sx(r.x);
        if (x < -500 || x > W + 500) continue;
        const dx = this.ship.x - x;
        const dy = GROUND - this.ship.y;
        if (Math.hypot(dx, dy) > r.range) continue;
        if (Math.abs(Math.atan2(dx, dy) - this.radarAngle(r)) < 0.12) seen = Math.max(seen, 1.8);
      }
      for (const j of this.jets) {
        const x = sx(j.x);
        const dx = x - this.ship.x; // jets fly left, sensor cone points left
        const dy = this.ship.y - j.y;
        if (dx > 0 && dx < 260 && Math.abs(dy) < dx * 0.35) seen = Math.max(seen, 2.4);
        if (Math.abs(dx) < 36 && Math.abs(dy) < 18) seen = 10; // mid-air collision is very detectable
      }
    }
    this.detect = clamp(this.detect + (seen ? seen * dt : -dt * 0.35), 0, 1);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.detect >= 1) {
      this.detect = 0;
      this.invuln = 2;
      this.hud.lives = (this.hud.lives ?? 1) - 1;
      this.fx.shake = 14;
      this.fx.flash('#ff5ec8', 1.2);
      this.fx.hype('📡 TRACKED', '#ff5ec8');
      this.fx.hitstop(0.12);
      xenoAudio?.boop();
      if ((this.hud.lives ?? 0) <= 0) {
        this.hud.phase = 'over';
        this.hud.message = `Tracked in sector ${this.sector}. Somewhere, a radar operator is getting promoted.`;
        this.hud.best = saveBest(this.id, this.hud.score);
      }
    }

    // --- jets move, packets collected
    for (const j of this.jets) {
      j.x += j.vx * dt;
      j.bob += dt;
    }
    for (const p of this.packets) {
      p.t += dt;
      if (this.cloaked) continue;
      const x = sx(p.x);
      if (Math.abs(x - this.ship.x) < 34 && Math.abs(p.y - this.ship.y) < 26) {
        p.x = -1e9;
        const pts = 150 * this.sector;
        this.hud.score += pts;
        this.fx.burst(this.ship.x, this.ship.y, '#38e8ff', 14, 180);
        this.fx.float(this.ship.x, this.ship.y - 30, `+${pts}`, '#38e8ff');
        xenoAudio?.blip(0.7);
      }
    }
    const alive = (wx: number) => sx(wx) > -600;
    this.radars = this.radars.filter((r) => alive(r.x));
    this.jets = this.jets.filter((j) => alive(j.x));
    this.packets = this.packets.filter((p) => alive(p.x));
    this.hud.goal = `Sector ${this.sector} · detection ${Math.round(this.detect * 100)}%`;
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.fx.applyShake(ctx);
    this.stars.draw(ctx, '#03020b', '#0a0a1f');
    const sx = (wx: number) => wx - this.scroll;

    // radar beams (behind everything)
    for (const r of this.radars) {
      const x = sx(r.x);
      if (x < -500 || x > W + 500) continue;
      const a = this.radarAngle(r);
      const g = ctx.createRadialGradient(x, GROUND, 0, x, GROUND, r.range);
      g.addColorStop(0, 'rgba(255,94,200,0.35)');
      g.addColorStop(1, 'rgba(255,94,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, GROUND);
      ctx.arc(x, GROUND, r.range, -Math.PI / 2 + a - 0.12, -Math.PI / 2 + a + 0.12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,94,200,0.12)';
      ctx.beginPath();
      ctx.arc(x, GROUND, r.range, Math.PI, 0);
      ctx.stroke();
    }
    // ground + hills (parallax)
    ctx.fillStyle = '#0c1424';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i <= 24; i++) {
      const h = this.hills[(Math.floor(this.scroll * 0.5 / 45) + i) % this.hills.length];
      ctx.lineTo(i * 45 - ((this.scroll * 0.5) % 45), GROUND - h + 20);
    }
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.fillStyle = '#111b2e';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    // radar dishes
    for (const r of this.radars) {
      const x = sx(r.x);
      if (x < -40 || x > W + 40) continue;
      const a = this.radarAngle(r);
      ctx.fillStyle = '#3b4766';
      ctx.fillRect(x - 4, GROUND - 22, 8, 22);
      ctx.save();
      ctx.translate(x, GROUND - 22);
      ctx.rotate(a);
      ctx.fillStyle = '#9aa7c7';
      ctx.beginPath();
      ctx.ellipse(0, -6, 16, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.restore();
      glow(ctx, '#ff5ec8', 10, () => {
        ctx.fillStyle = '#ff5ec8';
        ctx.fillRect(x - 2, GROUND - 26, 4, 4);
      });
    }
    // data packets
    for (const p of this.packets) {
      const x = sx(p.x);
      if (x < -20 || x > W + 20) continue;
      glow(ctx, '#38e8ff', 14, () => {
        ctx.save();
        ctx.translate(x, p.y + Math.sin(p.t * 3) * 5);
        ctx.rotate(p.t);
        ctx.strokeStyle = '#38e8ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-7, -7, 14, 14);
        ctx.restore();
      });
    }
    // jets + sensor cones
    for (const j of this.jets) {
      const x = sx(j.x);
      if (x < -300 || x > W + 300) continue;
      const y = j.y + Math.sin(j.bob * 2) * 4;
      ctx.fillStyle = 'rgba(255,211,107,0.09)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 260, y - 91);
      ctx.lineTo(x - 260, y + 91);
      ctx.fill();
      ctx.fillStyle = '#8b93a8';
      ctx.beginPath();
      ctx.moveTo(x - 22, y);
      ctx.lineTo(x + 18, y - 6);
      ctx.lineTo(x + 26, y - 16);
      ctx.lineTo(x + 26, y + 4);
      ctx.lineTo(x + 18, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd36b';
      ctx.fillRect(x - 24, y - 1, 3, 2);
    }
    // the ship
    const blink = this.invuln > 0 && Math.floor(this.t * 12) % 2 === 0;
    if (!blink) {
      ctx.globalAlpha = this.cloaked ? 0.25 : 1;
      drawSaucer(ctx, this.ship.x, this.ship.y, 70, this.t, this.cloaked ? '#a58bff' : '#5effd8');
      ctx.globalAlpha = 1;
    }
    // detection ring around the ship
    if (this.detect > 0.02) {
      ctx.strokeStyle = `rgba(255,94,200,${0.3 + this.detect * 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.ship.x, this.ship.y, 46, -Math.PI / 2, -Math.PI / 2 + this.detect * Math.PI * 2);
      ctx.stroke();
    }
    // touch cloak zone hint
    ctx.fillStyle = this.cloaked ? 'rgba(165,139,255,0.18)' : 'rgba(165,139,255,0.06)';
    ctx.fillRect(W - 130, 0, 130, H);
    ctx.fillStyle = 'rgba(165,139,255,0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CLOAK', W - 65, H - 20);
    this.fx.draw(ctx);
    ctx.restore();
    this.fx.drawOverlay(ctx);
  }
}
