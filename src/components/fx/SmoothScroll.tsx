'use client';

/**
 * Lenis inertial scrolling for document-scrolling pages.
 * Driven by GSAP's ticker and wired into ScrollTrigger so pinned sections and
 * scroll-linked animations move in lockstep with the smoothed scroll (no
 * jumps). Wheel input is softened a little; touch keeps native momentum.
 * Skipped on the full-viewport globe console (/matrix).
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === '/matrix') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      lerp: 0.065, // lower = glidier
      wheelMultiplier: 0.75, // each wheel notch travels less
      touchMultiplier: 1,
      smoothWheel: true,
      anchors: { offset: -80 }, // in-page links (#crop-lab etc.) glide too
    });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [pathname]);
  return null;
}
