'use client';

/**
 * src/components/hangar/BlueprintEditor.tsx
 * ---------------------------------------------------------------------------
 * A Spore-style "simple CAD" craft editor. Top-down blueprint canvas: tap a
 * part in the tray, tap the hull to drop it (auto left/right mirror), drag a
 * placed part to move it, tap it to select + delete. The hull's slot budget
 * caps how many parts fit; more parts = more power. Changes stream up through
 * onChange so the 3D preview and the server stay in sync.
 * ---------------------------------------------------------------------------
 */
import { useRef, useState } from 'react';
import { Trash2, FlipHorizontal2 } from 'lucide-react';
import { hullSlots, partsOfSlot, PART_BY_ID, RARITY, type Blueprint, type Module, type Slot } from '@/lib/craft';

const GLYPH: Record<Slot, string> = { frame: '⬡', thrusters: '▲', wings: '◣', weapon: '✦' };
const VB = { w: 200, h: 240 };
// Blueprint x[-1,1] -> svg X[10,190]; y[+1,-1] (nose top) -> svg Y[16,224].
const toSvgX = (x: number) => 100 + x * 90;
const toSvgY = (y: number) => 120 - y * 104;
const toBpX = (sx: number) => Math.max(-0.95, Math.min(0.95, (sx - 100) / 90));
const toBpY = (sy: number) => Math.max(-0.95, Math.min(0.95, (120 - sy) / 104));

export default function BlueprintEditor({
  bp,
  owned,
  onChange,
}: {
  bp: Blueprint;
  owned: Record<string, number>;
  onChange: (bp: Blueprint) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<string | null>(null); // tray part id armed for placing
  const [sel, setSel] = useState<number | null>(null);
  const [mirror, setMirror] = useState(true);
  const drag = useRef<{ i: number } | null>(null);

  const hull = PART_BY_ID[bp.hull];
  const slots = hullSlots(bp.hull);
  const used = bp.modules.length;
  const ownedFrames = partsOfSlot('frame').filter((p) => owned[p.id]);
  const trayParts = (['thrusters', 'wings', 'weapon'] as Slot[]).flatMap((s) => partsOfSlot(s).filter((p) => owned[p.id]));

  const commit = (modules: Module[], extra?: Partial<Blueprint>) => onChange({ ...bp, modules, ...extra });

  const pointFromEvent = (e: React.PointerEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const placeAt = (bx: number, by: number) => {
    if (!tool || used >= slots) return;
    const add: Module[] = [{ part: tool, x: bx, y: by }];
    if (mirror && Math.abs(bx) > 0.08 && used + 2 <= slots) add.push({ part: tool, x: -bx, y: by });
    commit([...bp.modules, ...add]);
    setSel(bp.modules.length); // select the first new one
  };

  const onSvgPointerDown = (e: React.PointerEvent) => {
    if (tool) {
      const { x, y } = pointFromEvent(e);
      placeAt(toBpX(x), toBpY(y));
    } else {
      setSel(null);
    }
  };

  const onChipPointerDown = (e: React.PointerEvent, i: number) => {
    e.stopPropagation();
    if (tool) return; // placing mode: ignore chip
    setSel(i);
    drag.current = { i };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onSvgPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { x, y } = pointFromEvent(e);
    const i = drag.current.i;
    const modules = bp.modules.map((m, j) => (j === i ? { ...m, x: toBpX(x), y: toBpY(y) } : m));
    commit(modules);
  };
  const endDrag = () => (drag.current = null);

  const del = () => {
    if (sel == null) return;
    commit(bp.modules.filter((_, j) => j !== sel));
    setSel(null);
  };

  return (
    <div>
      {/* Hull picker */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Hull</span>
        {ownedFrames.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => commit(bp.modules.slice(0, hullSlots(p.id)), { hull: p.id })}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${bp.hull === p.id ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/15 text-white' : 'border-white/15 text-white/55'}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_30%,#11204a55,#05060f)] p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          className="mx-auto block h-[300px] w-full touch-none select-none"
          onPointerDown={onSvgPointerDown}
          onPointerMove={onSvgPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* grid + centerline */}
          <defs>
            <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="#ffffff10" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={VB.w} height={VB.h} fill="url(#bp-grid)" />
          <line x1="100" y1="6" x2="100" y2="234" stroke={`${bp.color}55`} strokeWidth="0.8" strokeDasharray="3 4" />
          {/* hull silhouette (top-down): nose up */}
          <HullShape shape={hull?.shape ?? 'falcon'} color={bp.color} />
          {/* placed modules */}
          {bp.modules.map((m, i) => {
            const part = PART_BY_ID[m.part];
            if (!part) return null;
            const rc = RARITY[part.rarity];
            const selected = i === sel;
            return (
              <g key={i} transform={`translate(${toSvgX(m.x)} ${toSvgY(m.y)})`} onPointerDown={(e) => onChipPointerDown(e, i)} style={{ cursor: 'grab' }}>
                {selected && <circle r="13" fill="none" stroke="#fff" strokeWidth="1.5" />}
                <circle r="9.5" fill={rc.color} opacity="0.92" />
                <text textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#05060f" fontWeight="700">{GLYPH[part.slot]}</text>
              </g>
            );
          })}
        </svg>

        {/* budget + actions */}
        <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] uppercase tracking-wider text-white/55">
          {used}/{slots} parts
        </div>
        <div className="absolute right-2 top-2 flex gap-1.5">
          <button type="button" onClick={() => setMirror((v) => !v)} aria-pressed={mirror} title="Mirror placement" className={`rounded-lg border p-1.5 ${mirror ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/15 text-[var(--xeno-a)]' : 'border-white/15 text-white/50'}`}>
            <FlipHorizontal2 size={13} />
          </button>
          <button type="button" onClick={del} disabled={sel == null} title="Delete selected" className="rounded-lg border border-white/15 p-1.5 text-white/60 disabled:opacity-30">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-white/40">
        {tool ? 'Tap the hull to drop the part' : 'Pick a part below, then tap the hull · drag to move · tap to select'}
      </p>

      {/* Parts tray */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {trayParts.length === 0 && <p className="py-3 text-xs text-white/40">No modules yet — buy or loot thrusters, wings and weapons to build with.</p>}
        {trayParts.map((p) => {
          const rc = RARITY[p.rarity];
          const armed = tool === p.id;
          const q = owned[p.id];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setTool(armed ? null : p.id)}
              className={`shrink-0 rounded-xl border p-2 text-left ${armed ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/15' : 'border-white/12'}`}
              style={{ width: 110 }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm leading-none">{GLYPH[p.slot]}</span>
                <span className="rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase text-black" style={{ background: rc.color }}>{rc.name[0]}</span>
              </div>
              <p className="mt-1 truncate text-xs font-semibold">{p.name}</p>
              <p className="font-mono text-[9px] text-white/40">{q === Infinity ? 'stock' : `×${q}`}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A rough top-down hull silhouette per shape, nose up. */
function HullShape({ shape, color }: { shape: string; color: string }) {
  const paths: Record<string, string> = {
    dart: 'M100 20 L118 150 L100 175 L82 150 Z',
    falcon: 'M100 24 L122 120 L116 168 L100 182 L84 168 L78 120 Z',
    manta: 'M100 30 L150 150 L100 170 L50 150 Z',
    phantom: 'M100 18 L120 110 L108 176 L100 186 L92 176 L80 110 Z',
    juggernaut: 'M100 34 L138 96 L140 160 L116 184 L84 184 L60 160 L62 96 Z',
    titan: 'M100 26 L140 92 L146 164 L118 190 L82 190 L54 164 L60 92 Z',
  };
  return (
    <>
      <path d={paths[shape] ?? paths.falcon} fill={`${color}14`} stroke={`${color}aa`} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="100" cy="70" r="6" fill={`${color}33`} stroke={`${color}aa`} strokeWidth="1" />
    </>
  );
}
