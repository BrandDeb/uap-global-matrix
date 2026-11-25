/**
 * src/components/landing/voxelSpecies.ts
 * ---------------------------------------------------------------------------
 * The voxel lineup: Zorp (our original intern) plus beings described in
 * famous witness accounts, each generated from implicit shapes on an integer
 * grid. Every species returns hollow shells so the instanced mesh stays light.
 * ---------------------------------------------------------------------------
 */
import { Color, Vector3 } from 'three';

const V = 0.11; // voxel size

export interface Voxel {
  home: Vector3;
  color: Color;
  head: boolean;
}

/** Build the alien from implicit shapes on an integer grid. */
function buildZorp(): Voxel[] {
  const out: Voxel[] = [];
  const skin = new Color('#7dffb0');
  const skinDark = new Color('#3fd68a');
  const eye = new Color('#06060c');
  const shine = new Color('#ffffff');
  const glow = new Color('#ff5ec8');
  const belly = new Color('#c8ffe0');
  const inEllipsoid = (x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1;

  for (let x = -9; x <= 9; x++) {
    for (let y = -11; y <= 12; y++) {
      for (let z = -7; z <= 7; z++) {
        // Head: wide at the top, tapering chin (radius shrinks with lower y).
        const taper = y < 3 ? 0.55 + (y + 3) * 0.075 : 1;
        const head = inEllipsoid(x, y, z, 0, 4, 0, 8 * taper, 7, 6.2 * Math.max(0.7, taper));
        const body = inEllipsoid(x, y, z, 0, -7, 0, 3.4, 4, 2.8);
        const neck = Math.abs(x) <= 1 && Math.abs(z) <= 1 && y >= -4 && y <= -2;
        if (!head && !body && !neck) continue;
        // Hollow interior: only keep voxels with an empty neighbor somewhere.
        const solid = (a: number, b: number, c: number) => {
          const t = b < 3 ? 0.55 + (b + 3) * 0.075 : 1;
          return (
            inEllipsoid(a, b, c, 0, 4, 0, 8 * t, 7, 6.2 * Math.max(0.7, t)) ||
            inEllipsoid(a, b, c, 0, -7, 0, 3.4, 4, 2.8) ||
            (Math.abs(a) <= 1 && Math.abs(c) <= 1 && b >= -4 && b <= -2)
          );
        };
        if (solid(x + 1, y, z) && solid(x - 1, y, z) && solid(x, y + 1, z) && solid(x, y - 1, z) && solid(x, y, z + 1) && solid(x, y, z - 1)) continue;

        let color = (x + y + z) % 3 === 0 ? skinDark : skin;
        if (head) {
          // Almond eyes on the front face, tilted outward.
          for (const s of [-1, 1]) {
            const ex = x - s * 3.6;
            const ey = y - 3.2 - ex * 0.35 * s;
            if ((ex / 2.6) ** 2 + (ey / 1.6) ** 2 <= 1 && z > 2) color = eye;
            if (Math.abs(ex + 0.8 * s) < 0.6 && Math.abs(ey - 0.6) < 0.6 && z > 2) color = shine;
          }
          // Little smile.
          if (z > 3 && y === -1 && Math.abs(x) <= 2) color = eye;
          if (z > 3 && y === 0 && Math.abs(x) === 3) color = eye;
        }
        if (body && z > 1 && Math.abs(x) <= 1 && y > -9 && y < -5) color = belly;
        out.push({ home: new Vector3(x * V, y * V, z * V), color, head: head && !body });
      }
    }
  }
  // Antennae with glowing bobbles.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      out.push({ home: new Vector3((s * 3 + s * i * 0.6) * V, (11 + i) * V, 0), color: skinDark, head: true });
    }
    for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      out.push({ home: new Vector3((s * 6 + dx) * V, (16.5 + dy) * V, dz * V), color: glow, head: true });
    }
  }
  // Noodle arms (one waving).
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const wave = s > 0 ? i * 0.9 : -i * 0.2;
      out.push({ home: new Vector3((s * (3.5 + i * 0.8)) * V, (-6 + wave) * V, 0), color: skin, head: false });
    }
  }
  return out;
}

type Paint = (x: number, y: number, z: number) => Color | null;

const ell = (x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1;

/** Sample `paint` over a box and keep only surface voxels. */
function carve(paint: Paint, headFrom: number, [x0, x1, y0, y1, z0, z1]: number[]): Voxel[] {
  const out: Voxel[] = [];
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++) {
        const c = paint(x, y, z);
        if (!c) continue;
        const inside =
          paint(x + 1, y, z) && paint(x - 1, y, z) && paint(x, y + 1, z) && paint(x, y - 1, z) && paint(x, y, z + 1) && paint(x, y, z - 1);
        if (inside) continue;
        out.push({ home: new Vector3(x * V, y * V, z * V), color: c, head: y >= headFrom });
      }
  return out;
}

const add = (out: Voxel[], x: number, y: number, z: number, color: Color, head = false) =>
  out.push({ home: new Vector3(x * V, y * V, z * V), color, head });

/** Limb: a 1-voxel line from a to b. */
function limb(out: Voxel[], a: number[], b: number[], color: Color) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    add(out, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, color);
  }
}

/** The classic Grey: Roswell lore and the 1961 Betty & Barney Hill account. */
function buildGrey(): Voxel[] {
  const skin = new Color('#b9bfcf'), shade = new Color('#8e95aa'), eye = new Color('#05050a'), glint = new Color('#6c7cff');
  const out = carve(
    (x, y, z) => {
      const taper = y < 3 ? 0.45 + (y + 3) * 0.09 : 1;
      const head = ell(x, y, z, 0, 5, 0, 7.5 * taper, 8, 6 * Math.max(0.6, taper));
      const body = ell(x, y, z, 0, -8, 0, 2.6, 4.5, 2);
      const neck = Math.abs(x) <= 0 && Math.abs(z) <= 0 && y >= -4 && y <= -2;
      if (!head && !body && !neck) return null;
      if (head && z > 1) {
        for (const s of [-1, 1]) {
          const ex = x - s * 3.4, ey = y - 3.6 - ex * 0.45 * s;
          if ((ex / 3.2) ** 2 + (ey / 1.9) ** 2 <= 1) return Math.abs(ex + s) < 0.6 && Math.abs(ey - 0.8) < 0.6 ? glint : eye;
        }
        if (y === -1 && x === 0) return eye;
      }
      return (x + y) % 4 === 0 ? shade : skin;
    },
    -1,
    [-9, 9, -13, 14, -7, 7],
  );
  for (const s of [-1, 1]) {
    limb(out, [s * 2.5, -5, 0], [s * 5, -11, 1], skin);
    limb(out, [s * 1.2, -12, 0], [s * 1.6, -17, 0], skin);
  }
  return out;
}

/** Flatwoods Monster, West Virginia 1952: spade-shaped hood, red face, glowing eyes, pleated skirt. */
function buildFlatwoods(): Voxel[] {
  const hood = new Color('#1d3b2a'), hoodEdge = new Color('#2f6b47'), face = new Color('#ff4a3d'), eye = new Color('#ffb020'), skirt = new Color('#243f31'), pleat = new Color('#356b4d');
  return carve(
    (x, y, z) => {
      if (ell(x, y, z, 0, 4, 1, 3.6, 4.2, 3.2)) {
        for (const s of [-1, 1]) if (z > 2 && (x - s * 1.6) ** 2 + (y - 5) ** 2 <= 1.6) return eye;
        return face;
      }
      if (z >= -2 && z <= 0 && y >= -1 && y <= 17) {
        const w = y < 9 ? 3 + y * 0.75 : 9.75 - (y - 9) * 1.25;
        if (Math.abs(x) <= w) return Math.abs(x) >= w - 1 ? hoodEdge : hood;
      }
      if (y < -1 && y >= -14) {
        const r = 3 + (-1 - y) * 0.42;
        if ((x / r) ** 2 + (z / (r * 0.75)) ** 2 <= 1) return Math.abs(x) % 3 === 0 ? pleat : skirt;
      }
      return null;
    },
    0,
    [-11, 11, -14, 17, -9, 6],
  );
}

/** Kelly-Hopkinsville goblins, Kentucky 1955: silver skin, huge pointed ears, glowing yellow eyes. */
function buildGoblin(): Voxel[] {
  const skin = new Color('#cfd6e4'), shade = new Color('#9aa3b8'), eye = new Color('#ffd23f'), dark = new Color('#151520');
  const out = carve(
    (x, y, z) => {
      const head = ell(x, y, z, 0, 4, 0, 6, 6, 5);
      const ax = Math.abs(x);
      const ear = ax >= 5 && ax <= 13 && Math.abs(z) <= 1 && Math.abs(y - 5 - (ax - 5) * 0.6) <= 3.2 - (ax - 5) * 0.38;
      const body = ell(x, y, z, 0, -6, 0, 2.6, 4, 2.2);
      const neck = x === 0 && z === 0 && y >= -3 && y <= -1;
      if (!head && !ear && !body && !neck) return null;
      if (head && z > 2) {
        for (const s of [-1, 1]) if ((x - s * 2.6) ** 2 + (y - 4.5) ** 2 <= 3.4) return eye;
        if (y === 0 && ax <= 2) return dark;
      }
      return ear && ax > 8 ? shade : skin;
    },
    -1,
    [-14, 14, -11, 11, -6, 6],
  );
  for (const s of [-1, 1]) {
    limb(out, [s * 2.6, -4, 0], [s * 6, -10, 1], skin);
    limb(out, [s * 6, -10, 1], [s * 6.5, -15, 2], skin);
    limb(out, [s * 1.2, -10, 0], [s * 1.8, -15, 0], skin);
  }
  return out;
}

/** Dover Demon, Massachusetts 1977: watermelon head, glowing orange eyes, stick limbs. */
function buildDover(): Voxel[] {
  const skin = new Color('#e8b58a'), shade = new Color('#c98e63'), eye = new Color('#ff7a1a');
  const out = carve(
    (x, y, z) => {
      const head = ell(x, y, z, 0, 5, 0, 8, 6.5, 5.5);
      const body = Math.abs(x) <= 1 && Math.abs(z) <= 1 && y >= -9 && y <= -1;
      if (!head && !body) return null;
      if (head && z > 2) for (const s of [-1, 1]) if ((x - s * 3.2) ** 2 + ((y - 5) * 1.3) ** 2 <= 2.6) return eye;
      return (x + y + z) % 5 === 0 ? shade : skin;
    },
    0,
    [-9, 9, -9, 12, -6, 6],
  );
  for (const s of [-1, 1]) {
    limb(out, [s * 1, -3, 0], [s * 7, -7, 1], skin);
    limb(out, [s * 7, -7, 1], [s * 8, -12, 2], skin);
    limb(out, [s * 1, -9, 0], [s * 3, -16, 0], skin);
  }
  return out;
}

/** Reptilian: scaled skin, slit pupils and a crest, straight from decades of tabloid lore. */
function buildReptilian(): Voxel[] {
  const scale = new Color('#3f8f5a'), scale2 = new Color('#2c6b43'), belly = new Color('#c9d98a'), eye = new Color('#ffe14d'), slit = new Color('#0a0a0a'), crest = new Color('#ff5e5e');
  const out = carve(
    (x, y, z) => {
      const head = ell(x, y, z, 0, 5, 0, 5.5, 6, 5) || ell(x, y, z, 0, 2.5, 4, 3.4, 2.4, 4);
      const body = ell(x, y, z, 0, -7, 0, 4, 5, 3);
      const neck = Math.abs(x) <= 2 && Math.abs(z) <= 2 && y >= -3 && y <= 0;
      if (!head && !body && !neck) return null;
      if (head && z > 1) {
        for (const s of [-1, 1]) {
          const d = (x - s * 3) ** 2 + (y - 6) ** 2;
          if (d <= 2.2) return x === s * 3 ? slit : eye;
        }
        if (y === 2 && z >= 6 && Math.abs(x) === 1) return slit;
      }
      if (body && z > 1 && Math.abs(x) <= 2) return belly;
      return (x * 3 + y * 5 + z) % 4 === 0 ? scale2 : scale;
    },
    0,
    [-8, 8, -12, 12, -6, 9],
  );
  for (let z = -4; z <= 2; z += 2) for (let h = 0; h < 3 - Math.abs(z + 1) / 2; h++) add(out, 0, 11 + h, z, crest, true);
  for (const s of [-1, 1]) {
    limb(out, [s * 4, -5, 0], [s * 7, -10, 2], scale);
    limb(out, [s * 2, -11, 0], [s * 2.5, -16, 1], scale2);
  }
  limb(out, [0, -11, -3], [0, -15, -9], scale2);
  return out;
}

export interface Species {
  id: string;
  name: string;
  tag: string;
  blurb: string;
  voxels: Voxel[];
}

export const SPECIES: Species[] = [
  { id: 'zorp', name: 'Zorp', tag: 'Our intern · 100% original', blurb: 'Zero concept of personal space. Hover to pet him, click to make him briefly not exist. He grooves harder with the sound on.', voxels: buildZorp() },
  { id: 'grey', name: 'The Grey', tag: 'Roswell 1947 · Hill abduction 1961', blurb: 'Big head, bigger eyes, tiny mouth, strong opinions about probing. The most reported face in UFO history.', voxels: buildGrey() },
  { id: 'flatwoods', name: 'Flatwoods', tag: 'West Virginia · 1952', blurb: 'Ten feet tall, red face, glowing eyes and a spade-shaped hood. Seven witnesses, one very bad smell.', voxels: buildFlatwoods() },
  { id: 'goblin', name: 'Kelly Goblin', tag: 'Kentucky · 1955', blurb: 'Silver, big-eared and glowing-eyed. Besieged a farmhouse all night. Allegedly floated when shot at. Rude.', voxels: buildGoblin() },
  { id: 'dover', name: 'Dover Demon', tag: 'Massachusetts · 1977', blurb: 'A watermelon head on noodle legs with glowing orange eyes. Seen by four teens over two nights. Never seen again.', voxels: buildDover() },
  { id: 'reptilian', name: 'Reptilian', tag: 'Tabloid lore · 1970s to now', blurb: 'Scales, slit pupils and a crest. Probably not running any governments. Probably.', voxels: buildReptilian() },
];
