/**
 * src/auth.ts
 * ---------------------------------------------------------------------------
 * Auth.js (NextAuth v5) — GitHub sign-in with stateless JWT sessions. On first
 * sign-in the operator profile is upserted into `profiles` (id
 * "github:<id>", handle = GitHub login). Env: AUTH_SECRET, AUTH_GITHUB_ID,
 * AUTH_GITHUB_SECRET. Without them, sign-in is unavailable and the app falls
 * back to anonymous per-browser operator ids.
 * ---------------------------------------------------------------------------
 */
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { upsertProfile } from '@/lib/db/queries';

export const authConfigured = Boolean(
  process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: authConfigured ? [GitHub] : [],
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    async jwt({ token, profile }) {
      // `profile` is present only on the sign-in request.
      if (profile && typeof profile.id !== 'undefined') {
        const id = `github:${String(profile.id)}`;
        const handle = String((profile as { login?: string }).login ?? token.name ?? 'operator');
        await upsertProfile({ id, handle, avatarUrl: token.picture ?? null });
        token.operatorId = id;
        token.operatorHandle = handle;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        operatorId: typeof token.operatorId === 'string' ? token.operatorId : null,
        operatorHandle: typeof token.operatorHandle === 'string' ? token.operatorHandle : null,
      };
    },
  },
});

/** The verified operator handle for this request, or null when anonymous. */
export async function verifiedHandle(): Promise<string | null> {
  if (!authConfigured) return null;
  const session = (await auth()) as { operatorHandle?: string | null } | null;
  return session?.operatorHandle ?? null;
}

/** The verified operator id ("github:<id>") for this request, or null. */
export async function verifiedOperatorId(): Promise<string | null> {
  if (!authConfigured) return null;
  const session = (await auth()) as { operatorId?: string | null } | null;
  return session?.operatorId ?? null;
}
