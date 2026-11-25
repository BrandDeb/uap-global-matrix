'use client';

/**
 * src/hooks/useAuth.ts
 * ---------------------------------------------------------------------------
 * Operator identity via Auth.js: resolves the signed-in operator profile and
 * the configured providers (GitHub / Google) from GET /api/me, and exposes
 * social sign-in / sign-out. No email or password flow exists.
 *
 * With no provider configured, `providers` is empty, sign-in buttons hide, and
 * posts fall back to the anonymous per-browser operator id.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import { signIn, signOut as authSignOut } from 'next-auth/react';

export type AuthProvider = 'github' | 'google';

export interface OperatorProfile {
  readonly id: string;
  readonly operatorHandle: string;
  readonly avatarUrl: string | null;
  readonly operatorRank: string;
  readonly reputationScore: number;
}

function toProfile(row: Record<string, unknown>): OperatorProfile {
  return {
    id: String(row.id),
    operatorHandle: String(row.operator_handle ?? 'operator'),
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    operatorRank: String(row.operator_rank ?? 'NOVICE_OBSERVER'),
    reputationScore: Number(row.reputation_score ?? 0),
  };
}

export function useAuth(): {
  profile: OperatorProfile | null;
  ready: boolean;
  providers: AuthProvider[];
  signInWith: (provider: AuthProvider, redirectTo?: string) => Promise<{ error: { message: string } | null }>;
  /** @deprecated use signInWith('github') */
  signInWithGitHub: () => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
} {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const body = (await res.json()) as { providers?: string[]; profile?: Record<string, unknown> | null };
        if (cancelled) return;
        setProviders(
          (body.providers ?? []).filter((p): p is AuthProvider => p === 'github' || p === 'google'),
        );
        setProfile(body.profile ? toProfile(body.profile) : null);
      } catch {
        // offline / no database: stay anonymous
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWith = useCallback(
    async (provider: AuthProvider, redirectTo?: string): Promise<{ error: { message: string } | null }> => {
      if (!providers.includes(provider)) {
        return { error: { message: `${provider} sign-in is not configured on this deployment.` } };
      }
      await signIn(provider, { redirectTo: redirectTo ?? window.location.href });
      return { error: null };
    },
    [providers],
  );
  const signInWithGitHub = useCallback(() => signInWith('github'), [signInWith]);

  const signOut = useCallback(async (): Promise<void> => {
    await authSignOut({ redirect: false });
    setProfile(null);
  }, []);

  return { profile, ready, providers, signInWith, signInWithGitHub, signOut };
}
