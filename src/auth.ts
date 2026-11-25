/**
 * src/auth.ts
 * ---------------------------------------------------------------------------
 * Auth.js (NextAuth v5), social sign-in only (GitHub and Google; no email or
 * password), stateless JWT sessions. On first sign-in the operator profile is
 * upserted into `profiles` with id "<provider>:<account id>".
 *
 * Each provider switches on independently when its env vars are present:
 *   AUTH_SECRET (required for any)
 *   AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
 *   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
 * With none configured the app falls back to anonymous per-browser ids.
 * ---------------------------------------------------------------------------
 */
import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { upsertProfile } from '@/lib/db/queries';

const hasSecret = Boolean(process.env.AUTH_SECRET);
const githubOn = hasSecret && Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const googleOn = hasSecret && Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export type AuthProviderId = 'github' | 'google';

/** Providers that are configured on this deployment (shown as sign-in buttons). */
export const enabledProviders: AuthProviderId[] = [
  ...(githubOn ? (['github'] as const) : []),
  ...(googleOn ? (['google'] as const) : []),
];

export const authConfigured = enabledProviders.length > 0;

const providers: Provider[] = [...(githubOn ? [GitHub] : []), ...(googleOn ? [Google] : [])];

/** Turn a display name into a handle: letters/digits/_/- only, 3..24 chars. */
function slugHandle(raw: string): string {
  const s = raw.normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return (s || 'operator').slice(0, 24);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { signIn: '/signin' },
  callbacks: {
    async jwt({ token, profile, account }) {
      // `profile` + `account` are present only on the sign-in request.
      if (profile && account) {
        const provider = account.provider;
        const accountId = String(account.providerAccountId);
        const id = `${provider}:${accountId}`;
        const base =
          provider === 'github'
            ? String((profile as { login?: string }).login ?? token.name ?? 'operator')
            : // Google has no username: display name + a short stable suffix.
              `${slugHandle(String(profile.name ?? token.name ?? 'operator'))}_${accountId.slice(-4)}`;
        let handle = slugHandle(base);
        try {
          handle = await upsertProfile({ id, handle, avatarUrl: token.picture ?? null });
        } catch (e) {
          // Never block sign-in on a database hiccup; fall back to the derived handle.
          console.error('[auth] profile upsert failed', e);
        }
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
