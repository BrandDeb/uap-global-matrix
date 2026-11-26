'use client';

/**
 * App-style bottom tab bar on phones (hidden from md up): the five places
 * people go most. Hidden on the full-screen globe and inside games.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Globe2, Home, MessageCircle, User } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/matrix', label: 'Globe', Icon: Globe2 },
  { href: '/play', label: 'Play', Icon: Gamepad2 },
  { href: '/comms', label: 'Comms', Icon: MessageCircle },
  { href: '/settings', label: 'Me', Icon: User },
];

export default function MobileDock() {
  const path = usePathname();
  if (path === '/matrix' || path === '/comms' || path.startsWith('/arcade')) return null;
  return (
    <nav aria-label="App" className="fixed inset-x-3 bottom-3 z-[55] flex justify-around rounded-[22px] border border-white/10 bg-[#07060f]/85 px-1 py-1.5 backdrop-blur-xl md:hidden" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
      {TABS.map(({ href, label, Icon }) => {
        const on = href === '/' ? path === '/' : path.startsWith(href) || (href === '/play' && ['/cards', '/keeper', '/daily'].some((p) => path.startsWith(p)));
        return (
          <Link key={href} href={href} className={`flex min-w-[56px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] ${on ? 'bg-[var(--xeno-a)]/15 text-[var(--xeno-a)]' : 'text-white/55'}`}>
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
