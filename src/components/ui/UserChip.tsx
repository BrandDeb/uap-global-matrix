'use client';

/**
 * src/components/ui/UserChip.tsx
 * Identity chip: your alien avatar (+ name on wide screens), linking to
 * /settings. Signed-in operators show their verified handle.
 */

import Link from 'next/link';
import AlienAvatar from '@/components/profile/AlienAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useLocalProfile } from '@/lib/profile';

export default function UserChip({ className = '' }: { className?: string }) {
  const { profile } = useAuth();
  const p = useLocalProfile();
  const name = profile?.operatorHandle ?? p.name;
  return (
    <Link href="/settings" className={`xeno-btn !py-1 !pl-1 normal-case ${className}`} aria-label="Your profile and settings" data-cursor="YOU">
      <AlienAvatar index={p.avatar} spec={p.custom} size={26} />
      <span className="hidden max-w-[8rem] truncate lg:inline">{name ? `@${name}` : 'Settings'}</span>
    </Link>
  );
}
