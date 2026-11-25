/**
 * src/app/signin/page.tsx
 * Custom Auth.js sign-in page: social providers only (GitHub / Google) —
 * there is deliberately no email or password option.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { enabledProviders } from '@/auth';
import SignInButtons from '@/components/ui/SignInButtons';

export const metadata: Metadata = { title: 'Sign in · UAP/MATRIX' };

function safeCallback(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  // Only same-site relative paths — never bounce to another origin.
  return v && v.startsWith('/') && !v.startsWith('//') ? v : '/matrix';
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callback = safeCallback(params.callbackUrl);
  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4">
      {/* backdrop: glow + orbit rings */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(94,255,216,0.18),transparent_60%)]" />
        <div className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 animate-[spin_40s_linear_infinite] rounded-full border border-dashed border-[var(--xeno-a)]/20" />
        <div className="absolute left-1/2 top-1/2 h-[100vmin] w-[100vmin] -translate-x-1/2 -translate-y-1/2 animate-[spin_70s_linear_infinite_reverse] rounded-full border border-[var(--xeno-b)]/15" />
      </div>

      <div className="xeno-glass relative w-full max-w-md p-8 text-center md:p-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">Operator verification</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[0.9] md:text-5xl">
          Prove you’re
          <br />
          <span className="xeno-gradient-text">not an alien</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          Sign in to post under a verified handle. No passwords, no emails to remember — just your existing account.
        </p>

        {error && (
          <p className="mt-6 rounded-xl border border-[var(--xeno-d)]/40 bg-[var(--xeno-d)]/10 px-4 py-2 font-mono text-[11px] text-[var(--xeno-d)]">
            Sign-in failed ({error}). Try again?
          </p>
        )}

        {enabledProviders.length > 0 ? (
          <SignInButtons size="lg" prefix="Continue with" redirectTo={callback} className="mt-8 flex-col [&>button]:justify-center" />
        ) : (
          <p className="mt-8 font-mono text-[11px] text-white/40">
            Sign-in isn’t configured on this deployment yet. You can still post anonymously.
          </p>
        )}

        <Link href={callback} className="mt-8 inline-block font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
          ← stay anonymous
        </Link>
      </div>
    </main>
  );
}
