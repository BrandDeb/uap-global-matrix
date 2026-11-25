'use client';

/**
 * src/components/ui/UserChip.tsx
 * HUD identity chip: the signed-in operator (avatar + handle, click to sign
 * out) or a "Sign in" link to /signin. Hidden when no social provider is
 * configured on this deployment.
 */

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function UserChip() {
  const { profile, providers, signOut } = useAuth();
  if (profile) {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        title="Sign out"
        className="xeno-btn !px-2 !py-1.5 normal-case"
        aria-label={`Signed in as ${profile.operatorHandle}. Sign out`}
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar, tiny, no optimization needed
          <img src={profile.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--xeno-a)] text-[9px] text-black">
            {profile.operatorHandle.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[8rem] truncate lg:inline">@{profile.operatorHandle}</span>
      </button>
    );
  }
  if (providers.length === 0) return null;
  return (
    <Link href="/signin" className="xeno-btn" aria-label="Sign in">
      <LogIn size={13} /> <span className="hidden lg:inline">Sign in</span>
    </Link>
  );
}
