/**
 * src/lib/cardgen.ts
 * ---------------------------------------------------------------------------
 * Deterministic generator that fills the set to 156 cards: per colour it adds
 * 10 Common, 8 Rare, 5 Epic and 2 Legendary cards, plus one Mythic for the
 * whole set. Names come from themed syllable banks, stats from an archetype
 * (tank / striker / speedster / all-rounder) scaled by rarity, art from a
 * unique combination of avatar parts, lore from hand-written lines. Same
 * seed → same cards for everyone, forever (collector numbers are stable).
 * ---------------------------------------------------------------------------
 */
import type { Spec } from '@/components/profile/AlienAvatar';
import type { CardDef, Color, Rarity } from './cards';

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const BANK: Record<Color, { pre: string[]; suf: string[]; skins: string[]; bgs: string[]; lore: string[] }> = {
  red: {
    pre: ['Cinder', 'Flare', 'Scorch', 'Ash', 'Ember', 'Pyro', 'Blaze', 'Kiln', 'Furnace', 'Lava', 'Magma', 'Smoulder', 'Ignis', 'Char', 'Coal'],
    suf: ['ling', 'mite', 'wisp', 'fang', 'tail', 'drake', 'puff', 'spark', 'heart', 'claw', 'horn', 'maw'],
    skins: ['#ff5c5c', '#ff7a5c', '#ff8a3d', '#ff3d6b', '#ff9a7a'],
    bgs: ['#3a1a14', '#2a0f0f', '#40180f', '#2a0618'],
    lore: [
      'Hitchhiked here inside a meteor and refuses to say sorry.',
      'Warms its hands on re-entry. Every single time.',
      'Leaves scorched rings in fields and blames the cows.',
      'Its sneeze set off three car alarms in Nevada.',
      'Was the light over the lake. Will not elaborate.',
      'Toasts marshmallows on passing comets.',
      'Allergic to rain. Lives on Venus out of spite.',
      'Its body temperature is “yes”.',
    ],
  },
  yellow: {
    pre: ['Volt', 'Zap', 'Flick', 'Amp', 'Glint', 'Strobe', 'Pulse', 'Flash', 'Static', 'Ion', 'Beam', 'Halo', 'Lumen', 'Arc', 'Buzz'],
    suf: ['ling', 'bit', 'byte', 'spark', 'zip', 'pop', 'wing', 'ray', 'orb', 'blink', 'jolt', 'hop'],
    skins: ['#ffd23f', '#fff06b', '#ffe14d', '#fff4b0', '#ffc21f'],
    bgs: ['#3a2d10', '#33300f', '#2e2808', '#1c1408'],
    lore: [
      'Shows up as a lens flare in every holiday photo.',
      'Charges your phone if you ask nicely.',
      'Moves in zig-zags because straight lines are boring.',
      'Responsible for at least half of all “orb” sightings.',
      'Overtook a fighter jet, then waited for it to catch up.',
      'Hums at exactly the frequency of a fridge.',
      'Its blink can be seen from orbit. It blinks a lot.',
      'Once powered a small village by accident.',
    ],
  },
  purple: {
    pre: ['Umbra', 'Null', 'Hollow', 'Gloam', 'Rift', 'Murk', 'Phase', 'Nox', 'Echo', 'Veil', 'Warp', 'Dusk', 'Abyss', 'Mirage', 'Wraith'],
    suf: ['ling', 'shade', 'drift', 'eye', 'gaze', 'veil', 'loop', 'whisper', 'smoke', 'knot', 'fold', 'step'],
    skins: ['#a58bff', '#8f6bff', '#7a4dff', '#d2b4ff', '#b9bfcf'],
    bgs: ['#241a46', '#1a1030', '#0f0a24', '#1c2030'],
    lore: [
      'Exists slightly to the left of where you are looking.',
      'Missing time? It borrowed it. It will give it back.',
      'Only appears on radar, never on camera.',
      'Folded space to skip a queue once. Never again.',
      'Its shadow arrives a second before it does.',
      'Has been watching since 1947. Took notes.',
      'Hums in a key that makes dogs bark at nothing.',
      'Technically still in another dimension. Visiting.',
    ],
  },
  green: {
    pre: ['Moss', 'Fern', 'Sprig', 'Bloom', 'Thorn', 'Root', 'Vine', 'Spore', 'Clover', 'Bramble', 'Sap', 'Lichen', 'Petal', 'Seed', 'Briar'],
    suf: ['ling', 'kin', 'bud', 'leaf', 'shoot', 'pod', 'sprout', 'stalk', 'curl', 'nut', 'frond', 'cap'],
    skins: ['#7dffb0', '#c6ff6b', '#5cff8f', '#3f8f5a', '#b6ffcf'],
    bgs: ['#1b3a2c', '#26330f', '#0f2a1a', '#1d3b2a'],
    lore: [
      'Plants crop circles, then waters them for years.',
      'Photosynthesises starlight. Very slowly.',
      'Mistaken for a bush by four separate hikers.',
      'Its spores smell faintly of mint and mystery.',
      'Grew a forest on Mars. Nobody has noticed yet.',
      'Talks to houseplants. They talk back.',
      'Hibernates inside lunar craters for centuries.',
      'Will trade you seeds for interesting rocks.',
    ],
  },
  blue: {
    pre: ['Tide', 'Ripple', 'Drift', 'Brine', 'Frost', 'Glacier', 'Mist', 'Current', 'Coral', 'Hydro', 'Deep', 'Wave', 'Pearl', 'Surf', 'Fathom'],
    suf: ['ling', 'fin', 'gill', 'drop', 'swell', 'bubble', 'shell', 'flow', 'crest', 'tentacle', 'splash', 'mote'],
    skins: ['#6fb6ff', '#4cb8ff', '#5effd8', '#e6f2ff', '#cfd6e4'],
    bgs: ['#10264a', '#0f3a36', '#0a1a33', '#06142a'],
    lore: [
      'Dove into the ocean in 1967. Came up last Tuesday.',
      'Swims through clouds like they are water.',
      'Lives under the ice of Europa. Visits for snacks.',
      'Every USO report? Probably this one.',
      'Leaves wet footprints on the ceiling.',
      'Communicates entirely in whale song.',
      'Can hold its breath for one solar cycle.',
      'Chased a submarine for fun. The sub did not find it fun.',
    ],
  },
};

const HEADS: Spec['head'][] = ['bulb', 'round', 'squid', 'tall', 'blob'];
const EYES: Spec['eyes'][] = ['almond', 'cyclops', 'trio', 'stalks', 'visor', 'googly', 'sleepy'];
const TOPS: Spec['top'][] = ['none', 'antennae', 'single', 'fins', 'spikes'];
const MOUTHS: Spec['mouth'][] = ['smile', 'o', 'none', 'fangs', 'grin'];

const BASE: Record<Rarity, number> = { C: 1, R: 1.08, E: 1.16, L: 1.25, U: 1.35, M: 1.45 };
const ARCH = [
  { hp: 1.25, atk: 0.85, def: 1.3, spd: 0.75 }, // tank
  { hp: 0.9, atk: 1.3, def: 0.85, spd: 1.0 }, // striker
  { hp: 0.85, atk: 1.05, def: 0.8, spd: 1.45 }, // speedster
  { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 }, // all-rounder
];
const TITLES: Partial<Record<Rarity, string[]>> = {
  E: ['Warden', 'Hunter', 'Oracle', 'Herald', 'Sentinel'],
  L: ['Sovereign', 'Ancient', 'Emperor'],
};

export function generateCards(existing: CardDef[]): CardDef[] {
  const rand = mulberry(156);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const used = new Set(existing.map((c) => c.name));
  const looks = new Set(existing.map((c) => `${c.art.head}${c.art.eyes}${c.art.top}${c.art.mouth}${c.art.skin}`));
  const out: CardDef[] = [];
  const plan: [Rarity, number][] = [
    ['C', 10],
    ['R', 8],
    ['E', 5],
    ['L', 2],
  ];
  for (const color of ['red', 'yellow', 'purple', 'green', 'blue'] as Color[]) {
    const b = BANK[color];
    for (const [rarity, n] of plan) {
      for (let i = 0; i < n; i++) {
        let name = '';
        for (let tries = 0; tries < 50 && (!name || used.has(name)); tries++) {
          const base = `${pick(b.pre)}${pick(b.suf)}`;
          name = TITLES[rarity] ? `${pick(TITLES[rarity]!)} ${base}` : base;
        }
        used.add(name);
        let art: Spec;
        let key = '';
        do {
          art = { name, skin: pick(b.skins), bg: pick(b.bgs), head: pick(HEADS), eyes: pick(EYES), top: rarity === 'L' && rand() < 0.5 ? 'halo' : pick(TOPS), mouth: pick(MOUTHS), spots: rand() < 0.3 };
          key = `${art.head}${art.eyes}${art.top}${art.mouth}${art.skin}`;
        } while (looks.has(key));
        looks.add(key);
        const arch = ARCH[Math.floor(rand() * ARCH.length)];
        const m = BASE[rarity] * (0.95 + rand() * 0.1);
        out.push({
          id: `${color}-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
          name,
          color,
          rarity,
          hp: Math.round(100 * arch.hp * m),
          atk: Math.round(32 * arch.atk * m),
          def: Math.round(22 * arch.def * m),
          spd: Math.round(17 * arch.spd * m),
          lore: pick(b.lore),
          art,
        });
      }
    }
  }
  // The one Mythic: card #156.
  out.push({
    id: 'mythic-first-contact',
    name: 'First Contact',
    color: 'purple',
    rarity: 'M',
    hp: 190,
    atk: 66,
    def: 40,
    spd: 30,
    lore: 'The one they were all waiting for. It says hello in every language at once.',
    art: { name: 'First Contact', skin: '#ffffff', bg: '#05040d', head: 'bulb', eyes: 'trio', top: 'halo', mouth: 'smile', spots: false },
  });
  return out;
}
