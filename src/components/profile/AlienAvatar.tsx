/**
 * src/components/profile/AlienAvatar.tsx
 * ---------------------------------------------------------------------------
 * 20 original alien profile pictures, drawn as SVG from a small trait table
 * (head shape, skin, eyes, antennae, mouth, accessory). No two share the same
 * combination, and each has a name. Server- and client-safe (pure SVG).
 * ---------------------------------------------------------------------------
 */

export type Head = 'bulb' | 'round' | 'squid' | 'tall' | 'blob';
export type Eyes = 'almond' | 'cyclops' | 'trio' | 'stalks' | 'visor' | 'googly' | 'sleepy';
export type Top = 'none' | 'antennae' | 'single' | 'fins' | 'halo' | 'spikes';
export type Mouth = 'smile' | 'o' | 'none' | 'fangs' | 'grin';

export interface Spec {
  name: string;
  skin: string;
  bg: string;
  head: Head;
  eyes: Eyes;
  top: Top;
  mouth: Mouth;
  spots?: boolean;
}

export const ALIENS: ReadonlyArray<Spec> = [
  { name: 'Zorp', skin: '#7dffb0', bg: '#1b3a2c', head: 'bulb', eyes: 'almond', top: 'antennae', mouth: 'smile' },
  { name: 'Glim', skin: '#a58bff', bg: '#241a46', head: 'round', eyes: 'cyclops', top: 'single', mouth: 'o' },
  { name: 'Quex', skin: '#ff8fd0', bg: '#40183a', head: 'squid', eyes: 'trio', top: 'none', mouth: 'none' },
  { name: 'Blip', skin: '#5effd8', bg: '#0f3a36', head: 'blob', eyes: 'googly', top: 'none', mouth: 'grin' },
  { name: 'Vortha', skin: '#c9ccd6', bg: '#1c1f2e', head: 'tall', eyes: 'almond', top: 'none', mouth: 'none' },
  { name: 'Nibb', skin: '#ffd36b', bg: '#3d3014', head: 'round', eyes: 'stalks', top: 'none', mouth: 'smile' },
  { name: 'Ooloo', skin: '#38e8ff', bg: '#0d2f3d', head: 'bulb', eyes: 'sleepy', top: 'halo', mouth: 'smile' },
  { name: 'Krrt', skin: '#9ef06b', bg: '#22360f', head: 'tall', eyes: 'trio', top: 'spikes', mouth: 'fangs' },
  { name: 'Mux', skin: '#ff9c6b', bg: '#3d1f10', head: 'blob', eyes: 'cyclops', top: 'antennae', mouth: 'o' },
  { name: 'Sylph', skin: '#d6b3ff', bg: '#2c1a40', head: 'round', eyes: 'almond', top: 'fins', mouth: 'none', spots: true },
  { name: 'Grob', skin: '#7a9e5b', bg: '#1f2a16', head: 'blob', eyes: 'googly', top: 'single', mouth: 'fangs', spots: true },
  { name: 'Tink', skin: '#ffffff', bg: '#26263a', head: 'bulb', eyes: 'visor', top: 'antennae', mouth: 'grin' },
  { name: 'Ploo', skin: '#6bc3ff', bg: '#10243d', head: 'squid', eyes: 'googly', top: 'none', mouth: 'o' },
  { name: 'Xi-9', skin: '#b8c0d8', bg: '#14161f', head: 'tall', eyes: 'visor', top: 'single', mouth: 'none' },
  { name: 'Fizz', skin: '#ff5ec8', bg: '#3a0f30', head: 'round', eyes: 'trio', top: 'spikes', mouth: 'grin' },
  { name: 'Wobb', skin: '#c6ff5e', bg: '#2a3a0f', head: 'blob', eyes: 'stalks', top: 'none', mouth: 'smile', spots: true },
  { name: 'Elder', skin: '#9aa3b8', bg: '#1a1c26', head: 'bulb', eyes: 'sleepy', top: 'none', mouth: 'none' },
  { name: 'Skree', skin: '#5effa0', bg: '#0f3a24', head: 'squid', eyes: 'almond', top: 'fins', mouth: 'none' },
  { name: 'Lumi', skin: '#fff3b0', bg: '#3a3414', head: 'round', eyes: 'cyclops', top: 'halo', mouth: 'smile' },
  { name: 'Drax', skin: '#ff6b6b', bg: '#3a1010', head: 'tall', eyes: 'stalks', top: 'spikes', mouth: 'fangs' },
];

const INK = '#07060d';

function HeadShape({ h, skin }: { h: Head; skin: string }) {
  switch (h) {
    case 'bulb':
      return <path d="M50 14c20 0 30 14 30 30 0 18-14 36-30 42-16-6-30-24-30-42 0-16 10-30 30-30z" fill={skin} />;
    case 'round':
      return <circle cx="50" cy="52" r="30" fill={skin} />;
    case 'squid':
      return (
        <g fill={skin}>
          <path d="M50 16c18 0 28 12 28 28v14H22V44c0-16 10-28 28-28z" />
          {[26, 36, 46, 56, 66].map((x, i) => (
            <path key={x} d={`M${x} 56q${i % 2 ? 4 : -4} 14 0 26h8q${i % 2 ? -4 : 4} -12 0 -26z`} />
          ))}
        </g>
      );
    case 'tall':
      return <ellipse cx="50" cy="50" rx="22" ry="34" fill={skin} />;
    case 'blob':
      return <path d="M22 60c-4-22 10-40 28-40s34 14 30 36c-2 14-14 26-30 26S24 74 22 60z" fill={skin} />;
  }
}

function EyesShape({ e, head }: { e: Eyes; head: Head }) {
  const y = head === 'tall' ? 46 : head === 'squid' ? 40 : 48;
  switch (e) {
    case 'almond':
      return (
        <g fill={INK}>
          <ellipse cx="39" cy={y} rx="9" ry="5" transform={`rotate(25 39 ${y})`} />
          <ellipse cx="61" cy={y} rx="9" ry="5" transform={`rotate(-25 61 ${y})`} />
          <circle cx="36" cy={y - 2} r="1.6" fill="#fff" />
          <circle cx="58" cy={y - 2} r="1.6" fill="#fff" />
        </g>
      );
    case 'cyclops':
      return (
        <g>
          <circle cx="50" cy={y} r="11" fill="#fff" />
          <circle cx="52" cy={y + 1} r="6" fill={INK} />
          <circle cx="54" cy={y - 2} r="2" fill="#fff" />
        </g>
      );
    case 'trio':
      return (
        <g fill={INK}>
          <circle cx="38" cy={y + 2} r="4.5" />
          <circle cx="50" cy={y - 6} r="4.5" />
          <circle cx="62" cy={y + 2} r="4.5" />
        </g>
      );
    case 'stalks':
      return (
        <g>
          <path d={`M42 ${y - 4} L36 ${y - 22} M58 ${y - 4} L64 ${y - 22}`} stroke={INK} strokeWidth="3" />
          <circle cx="36" cy={y - 24} r="6" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx="64" cy={y - 24} r="6" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx="37" cy={y - 23} r="2.5" fill={INK} />
          <circle cx="63" cy={y - 23} r="2.5" fill={INK} />
        </g>
      );
    case 'visor':
      return <rect x="30" y={y - 6} width="40" height="11" rx="5.5" fill={INK} />;
    case 'googly':
      return (
        <g>
          <circle cx="40" cy={y} r="8" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx="60" cy={y} r="8" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx="43" cy={y + 3} r="3.5" fill={INK} />
          <circle cx="57" cy={y - 2} r="3.5" fill={INK} />
        </g>
      );
    case 'sleepy':
      return (
        <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d={`M32 ${y} q7 5 14 0`} />
          <path d={`M54 ${y} q7 5 14 0`} />
        </g>
      );
  }
}

function TopShape({ t, skin, head }: { t: Top; skin: string; head: Head }) {
  const y = head === 'tall' ? 18 : head === 'round' ? 24 : 18;
  switch (t) {
    case 'none':
      return null;
    case 'antennae':
      return (
        <g stroke={skin} strokeWidth="3" fill="none">
          <path d={`M42 ${y + 4} L34 ${y - 8}`} />
          <path d={`M58 ${y + 4} L66 ${y - 8}`} />
          <circle cx="34" cy={y - 10} r="4" fill="#ff5ec8" stroke="none" />
          <circle cx="66" cy={y - 10} r="4" fill="#ff5ec8" stroke="none" />
        </g>
      );
    case 'single':
      return (
        <g>
          <path d={`M50 ${y + 2} L50 ${y - 10}`} stroke={skin} strokeWidth="3" />
          <circle cx="50" cy={y - 12} r="4.5" fill="#5effd8" />
        </g>
      );
    case 'fins':
      return (
        <g fill={skin} opacity="0.85">
          <path d={`M22 ${y + 26} L10 ${y + 8} L28 ${y + 16} Z`} />
          <path d={`M78 ${y + 26} L90 ${y + 8} L72 ${y + 16} Z`} />
        </g>
      );
    case 'halo':
      return <ellipse cx="50" cy={y - 6} rx="18" ry="4" fill="none" stroke="#ffd36b" strokeWidth="3" />;
    case 'spikes':
      return (
        <g fill={skin}>
          <path d={`M38 ${y + 6} L42 ${y - 8} L46 ${y + 4} Z`} />
          <path d={`M47 ${y + 2} L50 ${y - 12} L53 ${y + 2} Z`} />
          <path d={`M54 ${y + 4} L58 ${y - 8} L62 ${y + 6} Z`} />
        </g>
      );
  }
}

function MouthShape({ m, head }: { m: Mouth; head: Head }) {
  const y = head === 'tall' ? 66 : head === 'squid' ? 52 : 66;
  switch (m) {
    case 'none':
      return null;
    case 'smile':
      return <path d={`M42 ${y} q8 6 16 0`} stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
    case 'o':
      return <ellipse cx="50" cy={y + 1} rx="3.5" ry="4.5" fill={INK} />;
    case 'grin':
      return <path d={`M40 ${y - 2} q10 10 20 0 z`} fill={INK} />;
    case 'fangs':
      return (
        <g>
          <path d={`M40 ${y} h20`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d={`M44 ${y} l2 5 l2 -5 M52 ${y} l2 5 l2 -5`} fill="#fff" stroke="#fff" strokeWidth="1" />
        </g>
      );
  }
}

/** Builder options (everything the renderer can draw). */
export const PARTS = {
  head: ['bulb', 'round', 'squid', 'tall', 'blob'] as Head[],
  eyes: ['almond', 'cyclops', 'trio', 'stalks', 'visor', 'googly', 'sleepy'] as Eyes[],
  top: ['none', 'antennae', 'single', 'fins', 'halo', 'spikes'] as Top[],
  mouth: ['smile', 'o', 'none', 'fangs', 'grin'] as Mouth[],
  skin: ['#7dffb0', '#a58bff', '#ff8fd0', '#5effd8', '#ffd36b', '#ff7a5c', '#9aa3b8', '#6fb6ff', '#c6ff6b', '#e8b58a'],
  bg: ['#1b3a2c', '#241a46', '#40183a', '#0f3a36', '#3a2d10', '#3a1a14', '#1c2030', '#10264a', '#26330f', '#2a0f2f'],
};

/** Render alien #index (wraps around), or a custom-built `spec`. */
export default function AlienAvatar({ index, size = 48, className, spec }: { index: number; size?: number; className?: string; spec?: Spec | null }) {
  const a = spec ?? ALIENS[((index % ALIENS.length) + ALIENS.length) % ALIENS.length];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={`${a.name} the alien`}>
      <circle cx="50" cy="50" r="50" fill={a.bg} />
      <TopShape t={a.top} skin={a.skin} head={a.head} />
      <HeadShape h={a.head} skin={a.skin} />
      {a.spots && (
        <g fill="#000" opacity="0.12">
          <circle cx="34" cy="36" r="4" />
          <circle cx="66" cy="62" r="5" />
          <circle cx="60" cy="30" r="3" />
        </g>
      )}
      <EyesShape e={a.eyes} head={a.head} />
      <MouthShape m={a.mouth} head={a.head} />
    </svg>
  );
}
