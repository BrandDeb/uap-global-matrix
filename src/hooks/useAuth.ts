'use client';

/**
 * src/hooks/useAuth.ts
 * ---------------------------------------------------------------------------
 * Operator identity: resolves the current Supabase session → profile, and
 * exposes GitHub OAuth sign-in / sign-out.
 *
 * NOTE: GitHub sign-in only works once the GitHub provider is configured in the
 * Supabase dashboard (Authentication → Providers) with a GitHub OAuth app.
 * Until then `signInWithGitHub` returns an error the UI surfaces gracefully.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    const loadProfile = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) {
          setProfile(null);
          setReady(true);
        }
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!cancelled) {
        setProfile(data ? toProfile(data as Record<string, unknown>) : null);
        setReady(true);
      }
    };

    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGitHub = useCallback(async (): Promise<{ error: { message: string } | null }> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    return { error: error ? { message: error.message } : null };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await getSupabaseBrowserClient().auth.signOut();
  }, []);

  return { profile, ready, signInWithGitHub, signOut };
}
