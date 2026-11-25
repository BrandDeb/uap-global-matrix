'use client';

/**
 * src/components/landing/AlienCursor.tsx
 * A custom cursor: a lagging ring with a little alien eye inside that looks
 * where you're going. It swells over anything interactive ([data-cursor] or
 * links/buttons) and shows the element's data-cursor label; over the
 * 3D scene (body[data-cursor], set by the canvas) it shows that label, e.g.
 * "BOOP" on the saucer or "PET" on Zorp. Hidden on touch / reduced motion.
 */

import { useEffect, useRef } from 'react';

export default function AlienCursor() {
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const pupil = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('alien-cursor-on');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const cur = { ...pos };
    let raf = 0;
    let hot = false;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor],a,button');
      const scene = document.body.dataset.cursor;
      hot = Boolean(el) || Boolean(scene);
      if (label.current) label.current.textContent = scene ? scene.toUpperCase() : (el?.dataset.cursor ?? '');
    };
    const loop = () => {
      const dx = pos.x - cur.x;
      const dy = pos.y - cur.y;
      cur.x += dx * 0.18;
      cur.y += dy * 0.18;
      const r = ring.current;
      if (r) {
        const scale = hot ? (label.current?.textContent ? 2.6 : 1.8) : 1;
        r.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      }
      if (pupil.current) {
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / 40) * 4;
        pupil.current.style.transform = `translate(${(dx / len) * k}px, ${(dy / len) * k}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.classList.remove('alien-cursor-on');
    };
  }, []);

  return (
    <div
      ref={ring}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden h-9 w-9 items-center justify-center rounded-full border border-[var(--xeno-a)]/70 mix-blend-difference transition-[width,height] duration-300 [.alien-cursor-on_&]:flex"
    >
      {/* almond alien eye */}
      <span className="relative flex h-3 w-4 items-center justify-center overflow-hidden rounded-[50%] bg-[var(--xeno-a)]">
        <span ref={pupil} className="block h-1.5 w-1.5 rounded-full bg-black" />
      </span>
      <span
        ref={label}
        className="absolute top-full mt-1 whitespace-nowrap font-mono text-[5px] tracking-[0.2em] text-[var(--xeno-a)]"
      />
    </div>
  );
}
