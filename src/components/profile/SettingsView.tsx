'use client';

/**
 * src/components/profile/SettingsView.tsx, /settings
 * Profile (alien avatar + pilot name), Appearance (Light / Dark / Auto),
 * Permissions (location only), Account (sign-in, your data, privacy,
 * intro again, feedback, sign out).
 */

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, LogOut, MessageSquareHeart, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import AlienAvatar, { ALIENS } from './AlienAvatar';
import { AlertsToggle, AvatarPicker, LocationPermission, NameField, ThemePicker } from './Pickers';
import SignInButtons from '@/components/ui/SignInButtons';
import { useAuth } from '@/hooks/useAuth';
import { clearProfile, saveProfile, useLocalProfile } from '@/lib/profile';
import { BADGES, useBadges } from '@/lib/achievements';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0a0816]/80 p-6 backdrop-blur-xl">
      <h2 className="mb-5 font-[family-name:var(--font-display)] text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ icon, label, sub, onClick, href, danger }: { icon: ReactNode; label: string; sub?: string; onClick?: () => void; href?: string; danger?: boolean }) {
  const inner = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 ${danger ? 'text-[var(--xeno-d)]' : 'text-white/70'}`}>{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block text-sm ${danger ? 'text-[var(--xeno-d)]' : 'text-white'}`}>{label}</span>
        {sub && <span className="block text-xs text-white/45">{sub}</span>}
      </span>
      {!danger && <ChevronRight size={16} className="text-white/30" />}
    </>
  );
  const cls = 'flex w-full items-center gap-4 rounded-2xl px-1 py-3 transition hover:bg-white/[0.03]';
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export default function SettingsView() {
  const p = useLocalProfile();
  const { profile, providers, signOut } = useAuth();
  const router = useRouter();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const display = profile?.operatorHandle ?? (p.name || 'Unnamed pilot');

  const eraseLocal = () => {
    if (!window.confirm('Erase your pilot name, avatar, theme and arcade bests from this device?')) return;
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('uap')) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    clearProfile();
  };

  return (
    <main className="relative min-h-[100svh] bg-[radial-gradient(ellipse_at_top,rgba(165,139,255,0.18),transparent_60%)] px-4 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 flex items-center justify-between">
          <button type="button" onClick={() => router.back()} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-full bg-white/5 hover:bg-white/10">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-extrabold">Settings</h1>
          <span className="w-11" />
        </header>

        {/* identity */}
        <div className="mb-8 flex flex-col items-center text-center">
          <AlienAvatar index={p.avatar} size={112} className="drop-shadow-[0_0_30px_rgba(94,255,216,0.35)]" />
          <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">{display}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            {ALIENS[p.avatar]?.name} · {profile ? 'verified pilot' : 'guest pilot'}
          </p>
        </div>

        <div className="space-y-5">
          <Card title="Your profile">
            <NameField />
            <p className="mb-3 mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Pick your alien</p>
            <AvatarPicker />
          </Card>

          <Card title="Badges">
            <BadgeGrid />
            <p className="mt-4 text-xs text-white/40">{profile ? 'Synced to your account, so they follow you to any device.' : 'Sign in to keep your badges, secrets and best scores on every device.'}</p>
          </Card>

          <Card title="Appearance">
            <ThemePicker />
          </Card>

          <Card title="Permissions">
            <LocationPermission />
            <div className="my-5 h-px bg-white/10" />
            <AlertsToggle />
          </Card>

          <Card title="Account">
            {profile ? (
              <p className="mb-2 text-sm text-white/60">
                Signed in as <span className="text-[var(--xeno-a)]">@{profile.operatorHandle}</span>, your posts carry a verified badge.
              </p>
            ) : providers.length > 0 ? (
              <div className="mb-3">
                <p className="mb-3 text-sm text-white/60">Sign in to get a verified handle. No passwords, ever.</p>
                <SignInButtons prefix="Continue with" redirectTo="/settings" />
              </div>
            ) : null}
            <div className="divide-y divide-white/5">
              <Row icon={<ShieldCheck size={18} />} label="Privacy" sub="What UAP/MATRIX stores about you" onClick={() => setPrivacyOpen((v) => !v)} />
              {privacyOpen && (
                <div className="space-y-2 py-3 text-xs leading-relaxed text-white/55">
                  <p>
                    <b className="text-white/80">On this device:</b> your pilot name, alien, theme and arcade best scores (browser
                    storage). Erase them any time below.
                  </p>
                  <p>
                    <b className="text-white/80">On our server:</b> things you post, comments, co-witness logs, upvotes, leaderboard
                    scores and sighting reports, under your pilot name. Signing in stores your public GitHub/Google name and avatar.
                  </p>
                  <p>
                    <b className="text-white/80">Never:</b> your location (Near me runs in your browser), passwords, or selling data.
                    Privacy-friendly analytics count page views without cookies.
                  </p>
                </div>
              )}
              <Row
                icon={<RotateCcw size={18} />}
                label="See the intro again"
                onClick={() => {
                  saveProfile({ onboarded: false });
                  router.push('/matrix');
                }}
              />
              <Row icon={<MessageSquareHeart size={18} />} label="Give feedback" sub="Ideas, bugs, sightings we missed" href="https://github.com/BrandDeb/uap-global-matrix/issues/new" />
              <Row icon={<Trash2 size={18} />} label="Erase my data on this device" onClick={eraseLocal} danger />
              {profile && <Row icon={<LogOut size={18} />} label="Sign out" onClick={() => void signOut()} danger />}
            </div>
          </Card>
        </div>

        <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
          UAP/MATRIX · built by Lowkee Studios
          <br />
          <Link href="/" className="mt-2 inline-block hover:text-white">
            ← back to Earth
          </Link>
        </p>
      </div>
    </main>
  );
}

function BadgeGrid() {
  const have = useBadges();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {BADGES.map((b) => {
        const got = have.includes(b.id);
        return (
          <li key={b.id} title={b.how} className={`rounded-2xl border p-3 text-center transition ${got ? 'border-[var(--xeno-a)]/40 bg-[var(--xeno-a)]/10' : 'border-white/10 opacity-45 grayscale'}`}>
            <span className="block text-3xl">{b.icon}</span>
            <span className="mt-1 block text-xs font-semibold">{b.name}</span>
            <span className="mt-1 block text-[10px] leading-snug text-white/45">{b.how}</span>
          </li>
        );
      })}
    </ul>
  );
}
