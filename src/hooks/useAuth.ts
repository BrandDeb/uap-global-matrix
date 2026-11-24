'use client';

/**
 * src/hooks/useAuth.ts
 * ---------------------------------------------------------------------------
 * Operator identity via Auth.js: resolves the signed-in operator profile from
 * GET /api/me and exposes GitHub sign-in / sign-out.
 *
 * GitHub sign-in works once AUTH_SECRET, AUTH_GITHUB_ID and AUTH_GITHUB_SECRET
 * are configured (see .env.example). Until then `signInWithGitHub` returns an
 * error the UI surfaces gracefully, and posts fall back to the anonymous
 * per-browser operator id.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import { signIn, signOut as authSignOut } from 'next-auth/react';

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
  signInWithGitHub: () => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
} {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [authAvailable, setAuthAvailable] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const body = (await res.json()) as { authAvailable?: boolean; profile?: Record<string, unknown> | null };
        if (cancelled) return;
        setAuthAvailable(body.authAvailable === true);
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

  const signInWithGitHub = useCallback(async (): Promise<{ error: { message: string } | null }> => {
    if (!authAvailable) {
      return { error: { message: 'GitHub sign-in is not configured on this deployment.' } };
    }
    await signIn('github', { redirectTo: window.location.href });
    return { error: null };
  }, [authAvailable]);

  const signOut = useCallback(async (): Promise<void> => {
    await authSignOut({ redirect: false });
    setProfile(null);
  }, []);

  return { profile, ready, signInWithGitHub, signOut };
}
