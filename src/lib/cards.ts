/**
 * src/lib/cards.ts
 * ---------------------------------------------------------------------------
 * XENO CARDS: the collectible card system.
 *   - 5 rarities: Common, Rare, Epic, Legendary, Ultra (summon odds below).
 *   - 5 colour types in a wheel; each beats the next for ×1.5 damage:
 *       RED → YELLOW → PURPLE → GREEN → BLUE → RED
 *   - Stars: pulling a card you already own adds a shard. Shards raise the
 *     card from 1★ up to 7★, then on to 14★ ("Zenith").
 *   - Training: spend Energy to level a card; the level cap rises with stars.
 *   - Battles: 3v3 auto-battles, deterministic from a seed.
 * Shared by client and server (no browser APIs here).
 * ---------------------------------------------------------------------------
 */
import type { Spec } from '@/components/profile/AlienAvatar';

export type Color = 'red' | 'yellow' | 'purple' | 'green' | 'blue';
export type Rarity = 'C' | 'R' | 'E' | 'L' | 'U';

export const COLORS: Record<Color, { name: string; hex: string; glow: string; skill: string; skillText: string; icon: string }> = {
  red: { name: 'Blaze', hex: '#ff5c5c', glow: '#ff9a7a', skill: 'Plasma Burst', skillText: 'Deals 1.8× damage.', icon: '🔥' },
  yellow: { name: 'Volt', hex: '#ffd23f', glow: '#fff09a', skill: 'Overcharge', skillText: 'Hits twice.', icon: '⚡' },
  purple: { name: 'Void', hex: '#a56bff', glow: '#d2b4ff', skill: 'Void Drain', skillText: 'Damages and heals itself for half.', icon: '🌀' },
  green: { name: 'Flora', hex: '#5cff8f', glow: '#b6ffcf', skill: 'Regrow', skillText: 'Heals the weakest ally.', icon: '🌿' },
  blue: { name: 'Tide', hex: '#4cb8ff', glow: '#a8e1ff', skill: 'Tidal Shield', skillText: 'Hits and halves the next hit taken.', icon: '💧' },
};
/** Each colour beats the next one in this list. */
export const WHEEL: Color[] = ['red', 'yellow', 'purple', 'green', 'blue'];
export const beats = (a: Color, b: Color) => WHEEL[(WHEEL.indexOf(a) + 1) % WHEEL.length] === b;
export const typeMult = (a: Color, b: Color) => (beats(a, b) ? 1.5 : beats(b, a) ? 0.67 : 1);

export const RARITY: Record<Rarity, { name: string; weight: number; mult: number; frame: string }> = {
  C: { name: 'Common', weight: 58, mult: 1, frame: '#8a93a8' },
  R: { name: 'Rare', weight: 27, mult: 1.2, frame: '#5ec8ff' },
  E: { name: 'Epic', weight: 10, mult: 1.45, frame: '#b46bff' },
  L: { name: 'Legendary', weight: 4, mult: 1.75, frame: '#ffcf4a' },
  U: { name: 'Ultra', weight: 1, mult: 2.1, frame: 'holo' },
};

export interface CardDef {
  id: string;
  name: string;
  color: Color;
  rarity: Rarity;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  lore: string;
  art: Spec;
}

const a = (skin: string, bg: string, head: Spec['head'], eyes: Spec['eyes'], top: Spec['top'], mouth: Spec['mouth'], spots = false): Spec => ({ name: '', skin, bg, head, eyes, top, mouth, spots });

export const CARDS: CardDef[] = [
  // RED / Blaze
  { id: 'ember', name: 'Ember Imp', color: 'red', rarity: 'C', hp: 90, atk: 30, def: 18, spd: 14, lore: 'Lives in rocket exhaust. Loves launch day.', art: a('#ff7a5c', '#3a1a14', 'round', 'googly', 'single', 'grin') },
  { id: 'magmo', name: 'Magmo', color: 'red', rarity: 'C', hp: 110, atk: 26, def: 24, spd: 9, lore: 'Mistaken for a meteor four times a year.', art: a('#ff5c5c', '#2a0f0f', 'blob', 'sleepy', 'none', 'o', true) },
  { id: 'pyrex', name: 'Pyrex', color: 'red', rarity: 'R', hp: 100, atk: 36, def: 20, spd: 16, lore: 'Its campfire stories set actual campfires.', art: a('#ff8a3d', '#3a1a10', 'tall', 'almond', 'spikes', 'fangs') },
  { id: 'solflare', name: 'Solflare', color: 'red', rarity: 'E', hp: 120, atk: 44, def: 24, spd: 18, lore: 'Surfs solar flares. Has never worn sunscreen.', art: a('#ff5c5c', '#40180f', 'bulb', 'visor', 'fins', 'smile') },
  { id: 'novarex', name: 'Nova Rex', color: 'red', rarity: 'L', hp: 140, atk: 52, def: 30, spd: 17, lore: 'Born in a supernova. Still a bit dramatic about it.', art: a('#ff3d6b', '#2a0618', 'squid', 'trio', 'halo', 'fangs') },
  // YELLOW / Volt
  { id: 'zapling', name: 'Zapling', color: 'yellow', rarity: 'C', hp: 80, atk: 28, def: 16, spd: 22, lore: 'Recharges by licking satellites.', art: a('#ffd23f', '#3a2d10', 'round', 'cyclops', 'antennae', 'smile') },
  { id: 'sparkle', name: 'Sparkplug', color: 'yellow', rarity: 'C', hp: 85, atk: 27, def: 18, spd: 20, lore: 'Shows up in photos as an orb. Every photo.', art: a('#fff06b', '#33300f', 'blob', 'googly', 'single', 'o') },
  { id: 'iridium', name: 'Iridium', color: 'yellow', rarity: 'R', hp: 95, atk: 33, def: 20, spd: 24, lore: 'The original flare. Blinding, briefly.', art: a('#ffe14d', '#2e2808', 'bulb', 'visor', 'antennae', 'none') },
  { id: 'ballvolt', name: 'Ball Volt', color: 'yellow', rarity: 'E', hp: 105, atk: 40, def: 22, spd: 27, lore: 'Ball lightning with a personality.', art: a('#ffd23f', '#1c1408', 'round', 'trio', 'spikes', 'grin', true) },
  { id: 'starlinker', name: 'Starlinker', color: 'yellow', rarity: 'L', hp: 120, atk: 48, def: 26, spd: 30, lore: 'Travels in trains of sixty. Leader of the pearls.', art: a('#fff4b0', '#232013', 'tall', 'almond', 'halo', 'smile') },
  // PURPLE / Void
  { id: 'grey', name: 'The Grey', color: 'purple', rarity: 'R', hp: 100, atk: 34, def: 22, spd: 18, lore: 'Big head, bigger eyes, opinions about probing.', art: a('#b9bfcf', '#1c2030', 'bulb', 'almond', 'none', 'none') },
  { id: 'shade', name: 'Shade', color: 'purple', rarity: 'C', hp: 85, atk: 29, def: 17, spd: 17, lore: 'Only visible in the corner of your eye.', art: a('#a58bff', '#241a46', 'blob', 'sleepy', 'none', 'none') },
  { id: 'wormy', name: 'Wormhole', color: 'purple', rarity: 'C', hp: 95, atk: 27, def: 21, spd: 15, lore: 'Every pocket leads somewhere else.', art: a('#8f6bff', '#1a1030', 'round', 'cyclops', 'single', 'o') },
  { id: 'voidling', name: 'Voidling', color: 'purple', rarity: 'E', hp: 115, atk: 42, def: 26, spd: 19, lore: 'Ate a black hole. Still hungry.', art: a('#7a4dff', '#0f0a24', 'squid', 'trio', 'fins', 'fangs') },
  { id: 'dover', name: 'Dover Demon', color: 'purple', rarity: 'L', hp: 125, atk: 50, def: 24, spd: 24, lore: 'Watermelon head, glowing eyes. Seen twice in 1977.', art: a('#e8b58a', '#2a0f2f', 'tall', 'googly', 'none', 'none') },
  // GREEN / Flora
  { id: 'zorp', name: 'Zorp', color: 'green', rarity: 'R', hp: 105, atk: 30, def: 24, spd: 16, lore: 'Intern. Zero concept of personal space.', art: a('#7dffb0', '#1b3a2c', 'bulb', 'almond', 'antennae', 'smile') },
  { id: 'sprout', name: 'Sproutling', color: 'green', rarity: 'C', hp: 100, atk: 24, def: 22, spd: 13, lore: 'Grows crop circles from the inside.', art: a('#c6ff6b', '#26330f', 'round', 'googly', 'single', 'smile') },
  { id: 'moss', name: 'Moss Moon', color: 'green', rarity: 'C', hp: 110, atk: 23, def: 26, spd: 10, lore: 'A tiny moon that forgot to stop growing moss.', art: a('#5cff8f', '#0f2a1a', 'blob', 'sleepy', 'none', 'o', true) },
  { id: 'reptilian', name: 'Reptilian', color: 'green', rarity: 'E', hp: 125, atk: 40, def: 30, spd: 15, lore: 'Scales, slit pupils. Definitely not running anything.', art: a('#3f8f5a', '#0f2a1a', 'tall', 'visor', 'spikes', 'fangs', true) },
  { id: 'flatwoods', name: 'Flatwoods', color: 'green', rarity: 'L', hp: 150, atk: 46, def: 34, spd: 12, lore: 'Ten feet tall, spade hood, terrible smell. 1952.', art: a('#ff4a3d', '#1d3b2a', 'squid', 'cyclops', 'fins', 'none') },
  // BLUE / Tide
  { id: 'bubbl', name: 'Bubbl', color: 'blue', rarity: 'C', hp: 95, atk: 25, def: 22, spd: 15, lore: 'Floats. That is the whole job.', art: a('#6fb6ff', '#10264a', 'round', 'googly', 'none', 'o') },
  { id: 'jelly', name: 'Space Jelly', color: 'blue', rarity: 'C', hp: 90, atk: 27, def: 19, spd: 18, lore: 'The universe’s least threatening threat.', art: a('#5effd8', '#0f3a36', 'squid', 'sleepy', 'none', 'smile') },
  { id: 'tictac', name: 'Tic Tac', color: 'blue', rarity: 'R', hp: 100, atk: 32, def: 22, spd: 24, lore: 'Dropped 80,000 ft in a second. No apology.', art: a('#e6f2ff', '#10264a', 'tall', 'visor', 'none', 'none') },
  { id: 'shagharbour', name: 'Shag Harbour', color: 'blue', rarity: 'E', hp: 120, atk: 40, def: 28, spd: 18, lore: 'Dived into the sea in 1967. Never came up.', art: a('#4cb8ff', '#0a1a33', 'bulb', 'trio', 'antennae', 'o') },
  { id: 'kelly', name: 'Kelly Goblin', color: 'blue', rarity: 'L', hp: 130, atk: 48, def: 28, spd: 22, lore: 'Silver, big ears, floated when shot at. Rude.', art: a('#cfd6e4', '#1c2030', 'round', 'googly', 'fins', 'grin') },
  // ULTRA (one per colour)
  { id: 'ultra-sun', name: 'Helios Prime', color: 'red', rarity: 'U', hp: 160, atk: 62, def: 34, spd: 22, lore: 'Lives inside a star. Visits Earth for the pizza.', art: a('#ffcf4a', '#3a1a10', 'bulb', 'trio', 'halo', 'grin') },
  { id: 'ultra-storm', name: 'Thunder Monarch', color: 'yellow', rarity: 'U', hp: 150, atk: 60, def: 30, spd: 34, lore: 'Every storm on Jupiter is one of its naps.', art: a('#fff06b', '#1c1408', 'squid', 'visor', 'halo', 'fangs') },
  { id: 'ultra-void', name: 'The Watcher', color: 'purple', rarity: 'U', hp: 155, atk: 64, def: 32, spd: 26, lore: 'Has seen every sighting. Filed none of them.', art: a('#d2b4ff', '#0f0a24', 'tall', 'cyclops', 'halo', 'none') },
  { id: 'ultra-gaia', name: 'Gaia Seed', color: 'green', rarity: 'U', hp: 180, atk: 54, def: 42, spd: 16, lore: 'Planted the first forest. Waiting to harvest.', art: a('#b6ffcf', '#0f2a1a', 'blob', 'almond', 'halo', 'smile', true) },
  { id: 'ultra-abyss', name: 'Abyss Leviathan', color: 'blue', rarity: 'U', hp: 170, atk: 60, def: 38, spd: 20, lore: 'The ocean of Europa is its bathtub.', art: a('#4cb8ff', '#06142a', 'squid', 'trio', 'fins', 'fangs') },
];
CARDS.forEach((c) => (c.art.name = c.name));
export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/* --- stars, levels, stats ----------------------------------------------------- */

/** Cumulative shards needed for 2★…14★ (index = stars - 2). */
const STAR_AT = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91];
export const MAX_STARS = 14;
export function starsFor(shards: number): number {
  let s = 1;
  while (s < MAX_STARS && shards >= STAR_AT[s - 1]) s++;
  return s;
}
export function shardsToNext(shards: number): number | null {
  const s = starsFor(shards);
  return s >= MAX_STARS ? null : STAR_AT[s - 1] - shards;
}
export const levelCap = (stars: number) => 10 + stars * 5;

export interface Owned {
  shards: number;
  level: number;
}

export function statsOf(def: CardDef, o: Owned) {
  const stars = starsFor(o.shards);
  const m = RARITY[def.rarity].mult * (1 + 0.06 * (o.level - 1)) * (1 + 0.08 * (stars - 1));
  return { hp: Math.round(def.hp * m), atk: Math.round(def.atk * m), def: Math.round(def.def * m), spd: Math.round(def.spd * (1 + 0.02 * (o.level - 1))), stars };
}
export const powerOf = (def: CardDef, o: Owned) => {
  const s = statsOf(def, o);
  return Math.round(s.hp * 0.4 + s.atk * 2 + s.def * 1.2 + s.spd);
};

/* --- summoning ------------------------------------------------------------------- */

/** Mulberry32 seeded RNG. */
export function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** One summon. `pity` = pulls since the last Legendary+; at 50 a Legendary is guaranteed. */
export function summon(rand: () => number, pity = 0): CardDef {
  let rarity: Rarity;
  if (pity >= 49) rarity = rand() < 0.15 ? 'U' : 'L';
  else {
    const total = Object.values(RARITY).reduce((s, r) => s + r.weight, 0);
    let roll = rand() * total;
    rarity = 'C';
    for (const [k, r] of Object.entries(RARITY) as [Rarity, (typeof RARITY)[Rarity]][]) {
      if ((roll -= r.weight) < 0) {
        rarity = k;
        break;
      }
    }
  }
  const pool = CARDS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(rand() * pool.length)];
}

/* --- battle ------------------------------------------------------------------------ */

export interface Fighter {
  id: string;
  side: 0 | 1;
  def: CardDef;
  hp: number;
  max: number;
  atk: number;
  dfn: number;
  spd: number;
  shield: boolean;
  acts: number;
}
export interface BattleLog {
  turn: number;
  actor: string;
  target: string;
  dmg: number;
  heal?: number;
  skill?: string;
  mult: number;
  text: string;
}

export function makeFighters(team: { id: string; o: Owned }[], side: 0 | 1): Fighter[] {
  return team
    .filter((t) => CARD_BY_ID[t.id])
    .slice(0, 3)
    .map((t, i) => {
      const d = CARD_BY_ID[t.id];
      const s = statsOf(d, t.o);
      return { id: `${side}-${i}-${d.id}`, side, def: d, hp: s.hp, max: s.hp, atk: s.atk, dfn: s.def, spd: s.spd, shield: false, acts: 0 };
    });
}

/** Deterministic 3v3 auto-battle. Returns winner side and a log for animation. */
export function battle(a: Fighter[], b: Fighter[], seed: number) {
  const rand = rng(seed);
  const all = [...a, ...b];
  const log: BattleLog[] = [];
  for (let turn = 1; turn <= 60; turn++) {
    const order = all.filter((f) => f.hp > 0).sort((x, y) => y.spd - x.spd || rand() - 0.5);
    for (const f of order) {
      if (f.hp <= 0) continue;
      const foes = all.filter((x) => x.side !== f.side && x.hp > 0);
      if (!foes.length) break;
      // Prefer a target the attacker has type advantage over, else the weakest.
      const target = foes.find((x) => beats(f.def.color, x.def.color)) ?? foes.sort((x, y) => x.hp - y.hp)[0];
      f.acts++;
      const useSkill = f.acts % 3 === 0;
      const mult = typeMult(f.def.color, target.def.color);
      const hit = (scale: number) => {
        let d = Math.max(1, Math.round(f.atk * scale * mult * (100 / (100 + target.dfn * 2)) * (0.9 + rand() * 0.2)));
        if (target.shield) {
          d = Math.round(d / 2);
          target.shield = false;
        }
        target.hp = Math.max(0, target.hp - d);
        return d;
      };
      let dmg = 0;
      let heal = 0;
      const skill = useSkill ? COLORS[f.def.color].skill : undefined;
      if (!useSkill) dmg = hit(1);
      else if (f.def.color === 'red') dmg = hit(1.8);
      else if (f.def.color === 'yellow') dmg = hit(0.85) + (target.hp > 0 ? hit(0.85) : 0);
      else if (f.def.color === 'purple') {
        dmg = hit(1.2);
        heal = Math.round(dmg / 2);
        f.hp = Math.min(f.max, f.hp + heal);
      } else if (f.def.color === 'green') {
        dmg = hit(0.9);
        const ally = all.filter((x) => x.side === f.side && x.hp > 0).sort((x, y) => x.hp / x.max - y.hp / y.max)[0];
        heal = Math.round(f.max * 0.22);
        ally.hp = Math.min(ally.max, ally.hp + heal);
      } else {
        dmg = hit(1.1);
        f.shield = true;
      }
      const tag = mult > 1 ? ' Super effective!' : mult < 1 ? ' Not very effective.' : '';
      log.push({ turn, actor: f.id, target: target.id, dmg, heal, skill, mult, text: `${f.def.name} ${skill ? `uses ${skill} on` : 'hits'} ${target.def.name} for ${dmg}.${tag}${target.hp <= 0 ? ` ${target.def.name} is down!` : ''}` });
    }
    const aliveA = a.some((x) => x.hp > 0);
    const aliveB = b.some((x) => x.hp > 0);
    if (!aliveA || !aliveB) return { winner: aliveA ? 0 : 1, log };
  }
  const left = (t: Fighter[]) => t.reduce((s, x) => s + x.hp / x.max, 0);
  return { winner: left(a) >= left(b) ? 0 : 1, log };
}
