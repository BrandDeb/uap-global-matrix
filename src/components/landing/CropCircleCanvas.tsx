'use client';

/**
 * src/components/landing/CropCircleCanvas.tsx
 * ---------------------------------------------------------------------------
 * Interactive 2D canvas: a moonlit wheat field you can carve crop circles
 * into. Every stroke is mirrored with N-fold radial symmetry (kaleidoscope),
 * glows like it was landed on, and plays a note from the soundtrack's scale
 * (pitch = distance from the center). "Let them land" draws a random pattern
 * by itself; "Save" downloads a PNG.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eraser, Sparkles } from 'lucide-react';
import { xenoAudio } from './audio';

interface Pt {
  x: number;
  y: number;
}

/** Pickable landing sites: base gradient, texture strokes, and the pale "flattened" color. */
export const FIELDS = [
  { id: 'wheat', label: '🌾 Wheat', base: ['#1e2a1a', '#070b08'], hue: [70, 25], sat: [30, 25], lit: [18, 16], flat: 'rgba(214,230,170,0.95)', len: 7, angle: -1.2 },
  { id: 'snow', label: '❄ Snowfield', base: ['#2a3140', '#0d1018'], hue: [210, 20], sat: [10, 15], lit: [55, 25], flat: 'rgba(255,255,255,0.97)', len: 3, angle: 0 },
  { id: 'desert', label: '🏜 Desert', base: ['#4a2f1a', '#160c06'], hue: [24, 14], sat: [45, 20], lit: [28, 18], flat: 'rgba(255,214,160,0.95)', len: 9, angle: 0.05 },
  { id: 'beach', label: '🏖 Beach', base: ['#5a4a32', '#1a140c'], hue: [40, 10], sat: [35, 15], lit: [45, 20], flat: 'rgba(120,200,220,0.9)', len: 3, angle: 0.4 },
  { id: 'moon', label: '🌕 Moon dust', base: ['#3a3a42', '#0b0b10'], hue: [240, 10], sat: [4, 6], lit: [30, 25], flat: 'rgba(240,240,255,0.95)', len: 2, angle: 0.8 },
  { id: 'mars', label: '🔴 Mars', base: ['#5a1e10', '#180604'], hue: [10, 12], sat: [55, 20], lit: [24, 16], flat: 'rgba(255,170,120,0.95)', len: 4, angle: 0.2 },
] as const;
type Field = (typeof FIELDS)[number];

export const GLOWS = ['#5effd8', '#a58bff', '#ff5ec8', '#ffd36b', '#38e8ff', '#ffffff'] as const;

function paintField(ctx: CanvasRenderingContext2D, w: number, h: number, f: Field) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, f.base[0]);
  g.addColorStop(1, f.base[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Texture: thousands of short strokes with slight color variation.
  for (let i = 0; i < (w * h) / 55; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const len = 2 + Math.random() * f.len;
    const a = f.angle + Math.random() * 0.3;
    ctx.strokeStyle = `hsla(${f.hue[0] + Math.random() * f.hue[1]}, ${f.sat[0] + Math.random() * f.sat[1]}%, ${f.lit[0] + Math.random() * f.lit[1]}%, 0.8)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
}

export default function CropCircleCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [folds, setFolds] = useState(8);
  const [fieldId, setFieldId] = useState<Field['id']>('wheat');
  const [glowColor, setGlowColor] = useState<string>(GLOWS[0]);
  const [brush, setBrush] = useState(7);
  const field = FIELDS.find((f) => f.id === fieldId) ?? FIELDS[0];
  const drawing = useRef(false);
  const last = useRef<Pt | null>(null);
  const lastNote = useRef(0);
  const autoTimer = useRef<number | null>(null);

  const reset = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintField(ctx, r.width, r.height, field);
  }, [field]);

  useEffect(() => {
    reset();
    const onResize = () => reset();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (autoTimer.current) window.clearInterval(autoTimer.current);
    };
  }, [reset]);

  /** Draw one segment mirrored `folds` times around the center. */
  const stroke = useCallback(
    (a: Pt, b: Pt, width = brush) => {
      const c = canvas.current;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) return;
      const r = c.getBoundingClientRect();
      const cx = r.width / 2;
      const cy = r.height / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineCap = 'round';
      for (let i = 0; i < folds; i++) {
        ctx.save();
        ctx.rotate((i / folds) * Math.PI * 2);
        for (const mirror of [1, -1]) {
          // flattened wheat (pale) + alien glow on top
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 14;
          ctx.strokeStyle = field.flat;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo((a.x - cx) * mirror, a.y - cy);
          ctx.lineTo((b.x - cx) * mirror, b.y - cy);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = glowColor;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = Math.max(1, width * 0.25);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      ctx.restore();
      // Music: pitch by distance from center, rate-limited.
      const now = performance.now();
      if (now - lastNote.current > 90) {
        lastNote.current = now;
        const dist = Math.hypot(b.x - cx, b.y - cy) / Math.hypot(cx, cy);
        xenoAudio?.note(1 - dist, 0.4);
      }
    },
    [folds, brush, glowColor, field],
  );

  const local = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  /** Let the aliens draw one: concentric rings + petals + dot chains. */
  const autoLand = () => {
    const c = canvas.current;
    if (!c) return;
    if (autoTimer.current) window.clearInterval(autoTimer.current);
    reset();
    xenoAudio?.boop();
    const r = c.getBoundingClientRect();
    const cx = r.width / 2;
    const cy = r.height / 2;
    const R = Math.min(cx, cy) * 0.85;
    const segs: [Pt, Pt, number][] = [];
    const ring = (rad: number, w: number) => {
      for (let i = 0; i < 48; i++) {
        const a0 = (i / 48) * Math.PI * 2;
        const a1 = ((i + 1) / 48) * Math.PI * 2;
        segs.push([{ x: cx + Math.cos(a0) * rad, y: cy + Math.sin(a0) * rad }, { x: cx + Math.cos(a1) * rad, y: cy + Math.sin(a1) * rad }, w]);
      }
    };
    ring(R * (0.25 + Math.random() * 0.1), 5);
    const petal = 0.4 + Math.random() * 0.3;
    for (let i = 0; i <= 24; i++) {
      const t0 = i / 24;
      const t1 = (i + 1) / 24;
      const p = (t: number) => ({
        x: cx + Math.sin(t * Math.PI) * R * petal * 0.35,
        y: cy - R * 0.25 - t * R * petal,
      });
      segs.push([p(t0), p(t1), 6]);
    }
    for (let i = 0; i < 4; i++) {
      const d = R * (0.7 + i * 0.08);
      segs.push([{ x: cx, y: cy - d }, { x: cx + 1, y: cy - d }, 10 - i * 2]);
    }
    ring(R * 0.95, 3);
    let k = 0;
    autoTimer.current = window.setInterval(() => {
      for (let n = 0; n < 3 && k < segs.length; n++, k++) stroke(segs[k][0], segs[k][1], segs[k][2]);
      if (k >= segs.length && autoTimer.current) {
        window.clearInterval(autoTimer.current);
        autoTimer.current = null;
      }
    }, 30);
  };

  const save = () => {
    const c = canvas.current;
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `my-crop-circle-${field.id}.png`;
    a.click();
  };

  return (
    <div className="flex select-none flex-col gap-4">
      <canvas
        ref={canvas}
        data-cursor="DRAW"
        className="aspect-square w-full touch-none rounded-[22px] border border-white/10 md:aspect-[16/10]"
        onPointerDown={(e) => {
          e.preventDefault(); // no text selection while carving
          drawing.current = true;
          last.current = local(e);
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const p = local(e);
          stroke(last.current, p);
          last.current = p;
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Landing site</span>
        {FIELDS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={fieldId === f.id}
            onClick={() => setFieldId(f.id)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${fieldId === f.id ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/15 text-white' : 'border-white/15 text-white/60 hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Glow</span>
          {GLOWS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Glow color ${c}`}
              aria-pressed={glowColor === c}
              onClick={() => setGlowColor(c)}
              className={`h-6 w-6 rounded-full transition ${glowColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-70 hover:opacity-100'}`}
              style={{ background: c, boxShadow: `0 0 12px ${c}` }}
            />
          ))}
        </div>
        <label className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
          Brush
          <input type="range" min={2} max={24} value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="xeno-range w-24" aria-label="Brush size" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={autoLand} className="xeno-btn" data-cursor="LAND">
          <Sparkles size={13} /> Let them land
        </button>
        <button type="button" onClick={reset} className="xeno-btn" data-cursor="WIPE">
          <Eraser size={13} /> Re-grow field
        </button>
        <button type="button" onClick={save} className="xeno-btn" data-cursor="SAVE">
          <Download size={13} /> Save PNG
        </button>
        <label className="ml-auto flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
          Symmetry
          <input
            type="range"
            min={3}
            max={16}
            value={folds}
            onChange={(e) => setFolds(Number(e.target.value))}
            className="xeno-range w-28"
            aria-label="Symmetry folds"
          />
          <span className="w-5 text-[var(--xeno-a)]">{folds}</span>
        </label>
      </div>
    </div>
  );
}
