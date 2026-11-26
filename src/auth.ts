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

// Trim credentials: a stray space/newline pasted into the dashboard breaks the token exchange.
const env = (k: string) => process.env[k]?.trim();
const providers: Provider[] = [
  ...(githubOn ? [GitHub({ clientId: env('AUTH_GITHUB_ID'), clientSecret: env('AUTH_GITHUB_SECRET') })] : []),
  ...(googleOn ? [Google({ clientId: env('AUTH_GOOGLE_ID'), clientSecret: env('AUTH_GOOGLE_SECRET') })] : []),
];

/** Turn a display name into a handle: letters/digits/_/- only, 3..24 chars. */
function slugHandle(raw: string): string {
  const s = raw.normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return (s || 'operator').slice(0, 24);
}

const ADJ = ['Cosmic', 'Quiet', 'Neon', 'Lunar', 'Solar', 'Stellar', 'Silent', 'Rogue', 'Hidden', 'Glowing', 'Drifting', 'Orbital', 'Nebula', 'Static', 'Velvet', 'Atomic'];
const NOUN = ['Saucer', 'Comet', 'Probe', 'Orb', 'Signal', 'Drifter', 'Grey', 'Beacon', 'Pulsar', 'Voyager', 'Watcher', 'Nomad', 'Specter', 'Quasar', 'Lantern', 'Moth'];
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
function codename(): string {
  return `${pick(ADJ)}${pick(NOUN)}_${Math.floor(1000 + Math.random() * 9000)}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  secret: env('AUTH_SECRET'),
  trustHost: true,
  pages: { signIn: '/signin' },
  callbacks: {
    async jwt({ token, profile, account }) {
      // `profile` + `account` are present only on the sign-in request.
      if (profile && account) {
        const provider = account.provider;
        const accountId = String(account.providerAccountId);
        const id = `${provider}:${accountId}`;
        // Privacy: never derive the public handle from a real name or login.
        // New pilots get a random alien codename (changeable in Settings).
        const base = codename();
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
