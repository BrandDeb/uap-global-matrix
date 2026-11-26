/**
 * src/lib/craft.ts
 * ---------------------------------------------------------------------------
 * Build-your-own craft from COLLECTIBLE PARTS. Four slots — frame, thrusters,
 * wings, weapon — each a part with a rarity and stats. You start with basics
 * and FIND better parts as drops while flying Star Forge (rarer parts drop
 * less often); scrap buys parts you've already discovered. loadoutStats turns
 * a chosen set of parts into the numbers the shooter flies, and drawShip is a
 * layered, metallic canvas renderer shared by the builder preview and the game.
 * ---------------------------------------------------------------------------
 */
export type Slot = 'frame' | 'thrusters' | 'wings' | 'weapon';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ShotType = 'blaster' | 'twin' | 'spread' | 'wave' | 'rail' | 'seeker' | 'prism';

export const RARITY: Record<Rarity, { name: string; color: string; weight: number }> = {
  common: { name: 'Common', color: '#9aa3b8', weight: 60 },
  rare: { name: 'Rare', color: '#5ec8ff', weight: 26 },
  epic: { name: 'Epic', color: '#b46bff', weight: 11 },
  legendary: { name: 'Legendary', color: '#ffd23f', weight: 3 },
};

export interface Part {
  id: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  blurb: string;
  // frame
  hp?: number;
  size?: number;
  shape?: 'dart' | 'falcon' | 'manta' | 'juggernaut' | 'phantom' | 'titan';
  // thrusters
  speed?: number; // multiplier
  flame?: 'ion' | 'pulse' | 'plasma' | 'warp' | 'void';
  // wings
  wingGuns?: number; // 0..2 extra mounts
  wingShape?: 'stub' | 'delta' | 'swept' | 'ring' | 'solar' | 'reaper';
  // weapon
  shot?: ShotType;
  damage?: number;
  fireRate?: number;
}

export const PARTS: Part[] = [
  // FRAMES
  { id: 'f-dart', slot: 'frame', name: 'Dart', rarity: 'common', shape: 'dart', hp: 3, size: 0.85, blurb: 'Light scout hull. 3 hits.' },
  { id: 'f-falcon', slot: 'frame', name: 'Falcon', rarity: 'common', shape: 'falcon', hp: 4, size: 1, blurb: 'Balanced hull. 4 hits.' },
  { id: 'f-manta', slot: 'frame', name: 'Manta', rarity: 'rare', shape: 'manta', hp: 4, size: 1.05, blurb: 'Wide, stable glider. 4 hits.' },
  { id: 'f-phantom', slot: 'frame', name: 'Phantom', rarity: 'epic', shape: 'phantom', hp: 5, size: 0.95, blurb: 'Stealth chassis. 5 hits.' },
  { id: 'f-juggernaut', slot: 'frame', name: 'Juggernaut', rarity: 'epic', shape: 'juggernaut', hp: 7, size: 1.3, blurb: 'Heavy armour. 7 hits.' },
  { id: 'f-titan', slot: 'frame', name: 'Titan', rarity: 'legendary', shape: 'titan', hp: 9, size: 1.5, blurb: 'Capital-class hull. 9 hits.' },
  // THRUSTERS
  { id: 't-ion', slot: 'thrusters', name: 'Ion Drive', rarity: 'common', speed: 1, flame: 'ion', blurb: 'Reliable push.' },
  { id: 't-pulse', slot: 'thrusters', name: 'Pulse Core', rarity: 'common', speed: 1.1, flame: 'pulse', blurb: 'Snappier handling.' },
  { id: 't-plasma', slot: 'thrusters', name: 'Plasma Jets', rarity: 'rare', speed: 1.2, flame: 'plasma', blurb: 'Hot and fast.' },
  { id: 't-warp', slot: 'thrusters', name: 'Warp Coil', rarity: 'epic', speed: 1.32, flame: 'warp', blurb: 'Bends space a little.' },
  { id: 't-void', slot: 'thrusters', name: 'Void Engine', rarity: 'legendary', speed: 1.45, flame: 'void', blurb: 'Silent, impossibly quick.' },
  // WINGS
  { id: 'w-stub', slot: 'wings', name: 'Stub Wings', rarity: 'common', wingShape: 'stub', wingGuns: 0, speed: 1, blurb: 'Standard issue.' },
  { id: 'w-delta', slot: 'wings', name: 'Delta Wings', rarity: 'common', wingShape: 'delta', wingGuns: 0, speed: 1.08, blurb: 'Sharper turns.' },
  { id: 'w-swept', slot: 'wings', name: 'Swept Wings', rarity: 'rare', wingShape: 'swept', wingGuns: 1, speed: 1.1, blurb: 'One wing gun mount.' },
  { id: 'w-ring', slot: 'wings', name: 'Ring Foils', rarity: 'epic', wingShape: 'ring', wingGuns: 1, speed: 1.2, hp: 1, blurb: 'Gun mount + extra plating.' },
  { id: 'w-reaper', slot: 'wings', name: 'Reaper Wings', rarity: 'legendary', wingShape: 'reaper', wingGuns: 2, speed: 1.15, blurb: 'Two wing gun mounts.' },
  // WEAPONS
  { id: 'g-blaster', slot: 'weapon', name: 'Blaster', rarity: 'common', shot: 'blaster', damage: 1, fireRate: 3.2, blurb: 'One straight bolt.' },
  { id: 'g-twin', slot: 'weapon', name: 'Twin Cannon', rarity: 'common', shot: 'twin', damage: 1, fireRate: 3.4, blurb: 'Two parallel bolts.' },
  { id: 'g-spread', slot: 'weapon', name: 'Spread Gun', rarity: 'rare', shot: 'spread', damage: 1, fireRate: 3, blurb: 'Three-way fan.' },
  { id: 'g-wave', slot: 'weapon', name: 'Wave Beam', rarity: 'rare', shot: 'wave', damage: 1.3, fireRate: 3.6, blurb: 'Weaving energy wave.' },
  { id: 'g-rail', slot: 'weapon', name: 'Railgun', rarity: 'epic', shot: 'rail', damage: 2.4, fireRate: 1.8, blurb: 'Slow, piercing, heavy.' },
  { id: 'g-seeker', slot: 'weapon', name: 'Seeker Pods', rarity: 'epic', shot: 'seeker', damage: 1.4, fireRate: 2.6, blurb: 'Homing missiles.' },
  { id: 'g-prism', slot: 'weapon', name: 'Prism Array', rarity: 'legendary', shot: 'prism', damage: 1.1, fireRate: 5, blurb: 'Five-way rainbow barrage.' },
];
export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<string, Part>;
export const partsOfSlot = (slot: Slot) => PARTS.filter((p) => p.slot === slot);

export interface Craft {
  frame: string;
  thrusters: string;
  wings: string;
  weapon: string;
  color: string;
}
export const STARTER_PARTS = ['f-falcon', 't-ion', 'w-stub', 'g-blaster'];
export const DEFAULT_CRAFT: Craft = { frame: 'f-falcon', thrusters: 't-ion', wings: 'w-stub', weapon: 'g-blaster', color: '#5effd8' };

const pick = (slot: Slot, id: string) => PART_BY_ID[id] && PART_BY_ID[id].slot === slot ? PART_BY_ID[id] : partsOfSlot(slot)[0];

export interface LoadoutStats {
  hp: number;
  speed: number;
  fireRate: number;
  damage: number;
  shot: ShotType;
  wingGuns: number;
  size: number;
  power: number;
}
export function loadoutStats(c: Craft): LoadoutStats {
  const f = pick('frame', c.frame);
  const t = pick('thrusters', c.thrusters);
  const w = pick('wings', c.wings);
  const g = pick('weapon', c.weapon);
  const hp = (f.hp ?? 4) + (w.hp ?? 0);
  const speed = 215 * (t.speed ?? 1) * (w.speed ?? 1);
  const power = Math.round(hp * 42 + speed / 4 + (g.fireRate ?? 3) * 22 + (g.damage ?? 1) * 70 + (w.wingGuns ?? 0) * 55 + RW[g.rarity] + RW[f.rarity] + RW[t.rarity] + RW[w.rarity]);
  return { hp, speed, fireRate: g.fireRate ?? 3, damage: g.damage ?? 1, shot: g.shot ?? 'blaster', wingGuns: w.wingGuns ?? 0, size: f.size ?? 1, power };
}
const RW: Record<Rarity, number> = { common: 0, rare: 25, epic: 55, legendary: 100 };

/** Pilot rank from lifetime scrap (gates nothing hard; shown as flavour). */
export function craftLevel(scrapEarned: number): number {
  return Math.min(20, 1 + Math.floor(Math.sqrt(scrapEarned / 90)));
}

/** Weighted random part discovery for a Star Forge drop. */
export function rollPart(rand: () => number): Part {
  const total = PARTS.reduce((s, p) => s + RARITY[p.rarity].weight, 0);
  let r = rand() * total;
  for (const p of PARTS) if ((r -= RARITY[p.rarity].weight) < 0) return p;
  return PARTS[0];
}

/* --- premium canvas renderer -------------------------------------------------- */

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, v + amt)));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

/** Draw a detailed, metallic craft centred at (x,y), nose up. */
export function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, c: Craft, t = 0) {
  const f = pick('frame', c.frame);
  const w = pick('wings', c.wings);
  const th = pick('thrusters', c.thrusters);
  const g = pick('weapon', c.weapon);
  const st = loadoutStats(c);
  const s = scale * (st.size || 1);
  const col = c.color;
  const lite = shade(col, 90);
  const mid = shade(col, -10);
  const dark = shade(col, -70);
  const steel = '#20242e';
  ctx.save();
  ctx.translate(x, y);

  // outer glow
  ctx.shadowColor = col;
  ctx.shadowBlur = s * 0.6;

  // ---- thruster plume (layered, animated) ----
  const flame = 0.55 + 0.45 * Math.sin(t * 22 + 1);
  const plume = { ion: ['#8af2ff', col], pulse: ['#fff', col], plasma: ['#ff9a7a', '#ff5ec8'], warp: ['#d2b4ff', '#a58bff'], void: ['#5effd8', '#38e8ff'] }[th.flame ?? 'ion'];
  for (const [i, len] of [[0, 1.7], [1, 1.2]] as const) {
    const grd = ctx.createLinearGradient(0, s * 0.5, 0, s * (0.5 + len));
    grd.addColorStop(0, plume[i]);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.globalAlpha = flame * (i ? 0.9 : 0.6);
    const ww = s * (i ? 0.1 : 0.2);
    ctx.beginPath();
    ctx.moveTo(-ww, s * 0.5);
    ctx.lineTo(0, s * (0.5 + len) * (0.85 + 0.3 * flame));
    ctx.lineTo(ww, s * 0.5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = s * 0.3;

  // ---- wings ----
  const wingPath = () => {
    ctx.beginPath();
    const sh = w.wingShape ?? 'stub';
    const spread = { stub: 0.95, delta: 1.15, swept: 1.1, ring: 1.0, solar: 1.35, reaper: 1.3 }[sh] ?? 1;
    const back = sh === 'swept' || sh === 'reaper' ? 0.75 : 0.5;
    ctx.moveTo(0, -s * 0.15);
    ctx.lineTo(-s * spread, s * back);
    ctx.lineTo(-s * 0.28, s * 0.42);
    ctx.lineTo(s * 0.28, s * 0.42);
    ctx.lineTo(s * spread, s * back);
    ctx.closePath();
  };
  if ((w.wingShape ?? 'stub') === 'ring') {
    ctx.strokeStyle = mid;
    ctx.lineWidth = s * 0.14;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * s * 0.8, s * 0.1, s * 0.3, s * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    const wg = ctx.createLinearGradient(-s, 0, s, 0);
    wg.addColorStop(0, dark);
    wg.addColorStop(0.5, mid);
    wg.addColorStop(1, dark);
    ctx.fillStyle = wg;
    wingPath();
    ctx.fill();
    ctx.strokeStyle = steel;
    ctx.lineWidth = s * 0.03;
    ctx.stroke();
  }
  // wing gun barrels
  ctx.fillStyle = '#e8edf6';
  for (let i = 1; i <= st.wingGuns; i++) {
    const wx = s * (0.5 + i * 0.22);
    for (const sx of [-1, 1]) ctx.fillRect(sx * wx - s * 0.035, -s * 0.5, s * 0.07, s * 0.34);
  }

  // ---- hull (metallic body) ----
  const shape = f.shape ?? 'falcon';
  const bw = { dart: 0.3, falcon: 0.4, manta: 0.52, juggernaut: 0.52, phantom: 0.36, titan: 0.56 }[shape];
  const nose = shape === 'dart' || shape === 'phantom' ? 1.05 : 0.92;
  const bg = ctx.createLinearGradient(-s * bw, 0, s * bw, 0);
  bg.addColorStop(0, dark);
  bg.addColorStop(0.42, col);
  bg.addColorStop(0.5, lite);
  bg.addColorStop(0.58, col);
  bg.addColorStop(1, dark);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(0, -s * nose);
  ctx.quadraticCurveTo(s * bw, -s * 0.25, s * bw * 0.72, s * 0.52);
  ctx.quadraticCurveTo(0, s * 0.42, -s * bw * 0.72, s * 0.52);
  ctx.quadraticCurveTo(-s * bw, -s * 0.25, 0, -s * nose);
  ctx.fill();
  // panel lines
  ctx.strokeStyle = shade(col, -40);
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(0, -s * nose * 0.9);
  ctx.lineTo(0, s * 0.45);
  ctx.moveTo(-s * bw * 0.4, -s * 0.1);
  ctx.lineTo(-s * bw * 0.5, s * 0.4);
  ctx.moveTo(s * bw * 0.4, -s * 0.1);
  ctx.lineTo(s * bw * 0.5, s * 0.4);
  ctx.stroke();

  // cockpit glass
  ctx.shadowBlur = 0;
  const cg = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.05);
  cg.addColorStop(0, '#eafcff');
  cg.addColorStop(1, shade(col, 60));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.28, s * 0.15, s * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // nose tip / main barrel
  ctx.fillStyle = '#eef3fb';
  ctx.fillRect(-s * 0.045, -s * (nose + 0.16), s * 0.09, s * 0.22);

  // weapon-specific muzzle accents
  if ((g.shot ?? 'blaster') === 'seeker' || g.shot === 'rail') {
    ctx.fillStyle = RARITY[g.rarity].color;
    ctx.fillRect(-s * 0.5, s * 0.08, s * 0.1, s * 0.3);
    ctx.fillRect(s * 0.4, s * 0.08, s * 0.1, s * 0.3);
  }
  ctx.restore();
}

export const SHIP_COLORS = ["#5effd8", "#a58bff", "#ff5ec8", "#ffd23f", "#38e8ff", "#ff7a5c", "#c6ff6b"];
