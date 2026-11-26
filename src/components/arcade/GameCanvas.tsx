'use client';

/**
 * src/components/arcade/GameCanvas.tsx
 * ---------------------------------------------------------------------------
 * Hosts one `Game`: owns the rAF loop (dt-clamped), keyboard + pointer input
 * mapped into the game's logical W×H space, CRT-style framing, the HUD and the
 * title / game-over overlays. HUD state is mirrored into React ~10×/s (not per
 * frame) to keep re-renders cheap. Pauses automatically when the tab hides.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { H, W, type Game, type HudState, type Input } from './engine';
import Leaderboard from './Leaderboard';

export interface GameMeta {
  readonly title: string;
  readonly tagline: string;
  readonly controls: ReadonlyArray<string>;
}

/**
 * Compose a 1080×1350 share card (portrait, social-feed friendly): the final
 * game frame, the score, and the brand, then share it (Web Share API with a
 * file on phones) or download it.
 */
async function shareScore(src: HTMLCanvasElement, meta: GameMeta, hud: HudState) {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const g = ctx.createLinearGradient(0, 0, 0, 1350);
  g.addColorStop(0, '#0d0726');
  g.addColorStop(1, '#020208');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1350);
  // game frame
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(60, 300, 960, 600, 36);
  ctx.clip();
  ctx.drawImage(src, 60, 300, 960, 600);
  ctx.restore();
  ctx.strokeStyle = 'rgba(94,255,216,0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(60, 300, 960, 600, 36);
  ctx.stroke();
  // text
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 30px monospace';
  ctx.fillText('U A P / A R C A D E', 540, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px sans-serif';
  ctx.fillText(meta.title.toUpperCase(), 540, 230);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 32px monospace';
  ctx.fillText('S C O R E', 540, 1010);
  const sg = ctx.createLinearGradient(240, 0, 840, 0);
  sg.addColorStop(0, '#5effd8');
  sg.addColorStop(1, '#ff5ec8');
  ctx.fillStyle = sg;
  ctx.font = '900 150px sans-serif';
  ctx.fillText(hud.score.toLocaleString(), 540, 1160);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '500 30px monospace';
  ctx.fillText(`best ${hud.best.toLocaleString()} · beat me → ${location.host}/arcade`, 540, 1260);

  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `${meta.title.replace(/\W+/g, '-').toLowerCase()}-score.png`, { type: 'image/png' });
  const text = `I scored ${hud.score.toLocaleString()} in ${meta.title} 🛸 beat me:`;
  const url = `${location.origin}/arcade`;
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, url });
      return;
    }
  } catch {
    return; // user cancelled the share sheet
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const BLOCK = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export default function GameCanvas({ create, meta, gameId, onReady, onPhaseChange }: { create: () => Game; meta: GameMeta; gameId: string; onReady?: (g: Game) => void; onPhaseChange?: (phase: HudState['phase'], g: Game) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<HudState>({ phase: 'title', score: 0, best: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const [immersive, setImmersive] = useState(false);
  const onReadyRef = useRef(onReady);
  const onPhaseRef = useRef(onPhaseChange);
  useEffect(() => {
    onReadyRef.current = onReady;
    onPhaseRef.current = onPhaseChange;
  });

  // Full-screen: real Fullscreen API where supported (Android), plus a fixed
  // overlay that also works on iPhone (which blocks element fullscreen).
  const toggleFull = () => {
    const el = wrap.current;
    const next = !immersive;
    setImmersive(next);
    try {
      if (next) void el?.requestFullscreen?.();
      else if (document.fullscreenElement) void document.exitFullscreen();
    } catch {
      /* iOS / unsupported: the overlay handles it */
    }
  };
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setImmersive((v) => (document.fullscreenElement ? v : false));
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  useEffect(() => {
    if (!immersive) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImmersive(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [immersive]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const game = create();
    onReadyRef.current?.(game);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const input: Input = { keys: new Set(), pressed: new Set(), pointer: { x: W / 2, y: H / 2, down: false, active: false } };
    const toLocal = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      input.pointer.x = ((e.clientX - r.left) / r.width) * W;
      input.pointer.y = ((e.clientY - r.top) / r.height) * H;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // Typing in a field (leaderboard name) must not drive the game.
      if ((e.target as HTMLElement | null)?.closest('input,textarea')) return;
      if (BLOCK.has(e.key)) e.preventDefault();
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!input.keys.has(k)) input.pressed.add(k);
      input.keys.add(k === ' ' ? ' ' : k);
      input.pointer.active = false; // keyboard takes over steering
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      input.keys.delete(k);
    };
    const onDown = (e: PointerEvent) => {
      toLocal(e);
      input.pointer.down = true;
      input.pointer.active = true;
      input.pressed.add('pointer');
      c.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      toLocal(e);
      if (e.pointerType !== 'mouse' || input.pointer.down) input.pointer.active = true;
      if (e.pointerType === 'mouse') input.pointer.active = true;
    };
    const onUp = () => {
      input.pointer.down = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let lastPhase = '';
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) {
        game.update(dt, input);
        ctx.clearRect(0, 0, W, H);
        game.draw(ctx);
      }
      input.pressed.clear();
      hudT += dt;
      if (hudT > 0.1 || game.hud.phase !== lastPhase) {
        hudT = 0;
        if (game.hud.phase !== lastPhase) onPhaseRef.current?.(game.hud.phase, game);
        lastPhase = game.hud.phase;
        setHud({ ...game.hud });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerup', onUp);
    };
  }, [create]);

  return (
    <div ref={wrap} className={immersive ? "fixed inset-0 z-[90] flex items-center justify-center bg-black p-2" : "relative mx-auto w-full max-w-[1100px]"}>
      {/* cabinet bezel */}
      <div className={`relative overflow-hidden border border-white/10 bg-black shadow-[0_0_120px_rgba(94,255,216,0.15)] ${immersive ? "max-h-full max-w-full rounded-[14px] p-1" : "w-full rounded-[28px] p-2 md:p-3"}`} style={immersive ? { aspectRatio: "8 / 5", height: "min(100dvh, 62.5dvw)", width: "min(160dvh, 100dvw)" } : undefined}>
        <canvas
          ref={canvas}
          className="block aspect-[8/5] w-full touch-none rounded-[20px]"
          aria-label={`${meta.title} game`}
        />
        {/* fullscreen toggle */}
        <button
          type="button"
          onClick={toggleFull}
          aria-label={immersive ? 'Exit full screen' : 'Full screen'}
          className="pointer-events-auto absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur md:right-4 md:top-4"
        >
          {immersive ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
        {immersive && (
          <p className="pointer-events-none absolute inset-x-0 top-14 z-10 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-white/35 md:hidden">
            rotate for landscape
          </p>
        )}
        {/* scanlines + vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-[20px] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.03)_0_1px,transparent_1px_3px)] shadow-[inset_0_0_120px_rgba(0,0,0,0.85)] md:inset-3"
        />

        {/* HUD */}
        {hud.phase === 'playing' && (
          <div className="pointer-events-none absolute inset-x-6 top-5 flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-white/70 md:inset-x-8 md:top-6 md:text-xs">
            <div>
              <span className="block text-white/40">Score</span>
              <span className="text-lg text-[var(--xeno-a)] md:text-2xl">{hud.score.toLocaleString()}</span>
              {hud.goal && <span className="mt-1 block text-[9px] text-white/55 md:text-[10px]">{hud.goal}</span>}
            </div>
            {hud.meter !== undefined && (
              <div className="hidden w-48 sm:block">
                <span className="block text-center text-white/40">{hud.meterLabel}</span>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-100"
                    style={{
                      width: `${Math.round((hud.meter ?? 0) * 100)}%`,
                      background: (hud.meter ?? 0) > 0.85 ? 'var(--xeno-d)' : 'linear-gradient(90deg,var(--xeno-b),var(--xeno-a))',
                    }}
                  />
                </div>
              </div>
            )}
            <div className="text-right">
              <span className="block text-white/40">{meta.title === 'Moo-ve It' ? 'Night' : meta.title === 'Radar Ghost' ? 'Sector' : 'Wave'} {hud.level ?? ''}</span>
              <span className="text-base text-[var(--xeno-d)] md:text-lg">{'♥'.repeat(Math.max(0, hud.lives ?? 0))}</span>
            </div>
          </div>
        )}

        {/* Title / game over */}
        {hud.phase !== 'playing' && (
          <div className="pointer-events-none absolute inset-2 flex flex-col items-center justify-center rounded-[20px] bg-black/55 px-6 text-center backdrop-blur-[2px] md:inset-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">
              {hud.phase === 'over' ? 'Game over' : 'Insert coin (just kidding)'}
            </p>
            <h2 className="xeno-gradient-text mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase md:text-7xl">
              {meta.title}
            </h2>
            {hud.phase === 'over' ? (
              <>
                <p className="mt-3 max-w-md text-sm text-white/60">{hud.message}</p>
                <p className="mt-5 font-mono text-sm text-white/70">
                  SCORE <span className="text-[var(--xeno-a)]">{hud.score.toLocaleString()}</span> · BEST{' '}
                  <span className="text-[var(--xeno-d)]">{hud.best.toLocaleString()}</span>
                  {hud.score >= hud.best && hud.score > 0 && <span className="ml-2 text-[var(--xeno-a)]">★ NEW BEST</span>}
                </p>
                <button
                  type="button"
                  onClick={() => canvas.current && void shareScore(canvas.current, meta, hud)}
                  className="xeno-btn pointer-events-auto mt-5 !border-[var(--xeno-d)]/60 !text-[var(--xeno-d)] hover:!text-black"
                >
                  Share score card ↗
                </button>
                <Leaderboard key={`${gameId}-${hud.score}`} game={gameId} score={hud.score} />
              </>
            ) : (
              <>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60">{meta.tagline}</p>
                <ul className="mt-5 flex flex-wrap justify-center gap-2">
                  {meta.controls.map((c) => (
                    <li key={c} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] text-white/60">
                      {c}
                    </li>
                  ))}
                </ul>
                {hud.best > 0 && <p className="mt-4 font-mono text-xs text-white/40">BEST {hud.best.toLocaleString()}</p>}
              </>
            )}
            <p className="mt-7 animate-pulse font-mono text-xs uppercase tracking-[0.4em] text-[var(--xeno-a)]">
              Press Space · or tap
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
