'use client';

/**
 * Full-screen site menu (works on every screen size): big display links with
 * a one-line teaser each. Closes on Esc, link click, or the X.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export const SITE_LINKS = [
  { href: '/matrix', label: 'The Globe', note: 'Every sighting on a live 3D Earth' },
  { href: '/comms', label: 'Comms', note: 'Describe sightings, talk to skywatchers' },
  { href: '/daily', label: 'Daily Challenge', note: 'One real case a day. Keep your streak' },
  { href: '/arcade', label: 'Arcade', note: 'Five games, weekly prizes' },
  { href: '/archive', label: 'The Files', note: 'Declassified cases, 1942 to now' },
  { href: '/crop-circles', label: 'Crop Circles', note: 'Community gallery' },
  { href: '/pilots', label: 'Pilots', note: 'Profiles, ranks and the crew feed' },
  { href: '/feed', label: 'Live Feed', note: 'Newest reports' },
];

export default function SiteMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="xeno-btn !px-3" data-cursor="MENU">
        <Menu size={14} />
        <span className="hidden lg:inline">Menu</span>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-[80] overflow-y-auto bg-[#030208]/95 backdrop-blur-xl" data-lenis-prevent>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
            <span className="font-[family-name:var(--font-display)] text-sm tracking-[0.3em]">
              UAP<span className="text-[var(--xeno-a)]">/</span>MATRIX
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="xeno-btn !px-3">
              <X size={14} />
            </button>
          </div>
          <nav className="mx-auto max-w-5xl px-5 pb-16">
            <ul className="grid gap-x-10 md:grid-cols-2">
              {SITE_LINKS.map((l, i) => (
                <li key={l.href} className="border-b border-white/10">
                  <Link href={l.href} onClick={() => setOpen(false)} className="group flex items-baseline gap-4 py-5">
                    <span className="font-mono text-[10px] text-white/30">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="block font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase leading-[1.05] transition group-hover:text-[var(--xeno-a)] md:text-4xl">{l.label}</span>
                      <span className="mt-1 block text-sm text-white/45">{l.note}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/settings" onClick={() => setOpen(false)} className="xeno-btn">Settings & badges</Link>
              <Link href="/signin" onClick={() => setOpen(false)} className="xeno-btn">Sign in</Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
