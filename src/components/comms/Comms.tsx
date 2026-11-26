'use client';

/**
 * In-app chat: moderated text channels, polled every 4 s while visible.
 * Signed-out visitors can read; posting needs Google/GitHub sign-in.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flag, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ROOMS, RULES } from '@/lib/comms';
import { useAuth } from '@/hooks/useAuth';
import { xenoAudio } from '@/components/landing/audio';

interface Msg {
  id: number;
  handle: string;
  body: string;
  created_at: string;
}

export default function Comms() {
  const { profile, ready } = useAuth();
  const [room, setRoom] = useState<string>(ROOMS[0].id);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const lastId = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  const poll = useCallback(async (r: string, reset = false) => {
    if (reset) lastId.current = 0;
    const res = await fetch(`/api/comms?room=${encodeURIComponent(r)}&after=${lastId.current}`, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) return;
    const d = (await res.json()) as { messages: Msg[] };
    if (d.messages.length) {
      lastId.current = d.messages[d.messages.length - 1].id;
      setMsgs((m) => (reset ? d.messages : [...m, ...d.messages]).slice(-150));
    } else if (reset) setMsgs([]);
  }, []);

  useEffect(() => {
    void poll(room, true);
    const t = window.setInterval(() => document.visibilityState === 'visible' && void poll(room), 4000);
    return () => window.clearInterval(t);
  }, [room, poll]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const r = await fetch('/api/comms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room, body }) });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) {
      toast(d.error ?? 'Could not send.');
      return;
    }
    setText('');
    xenoAudio?.blip(0.6);
    void poll(room);
  };

  const report = async (id: number) => {
    await fetch('/api/comms/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    toast('Reported. Thanks for keeping Comms clean.');
  };

  const meta = ROOMS.find((r) => r.id === room)!;
  return (
    <main className="mx-auto flex h-[100svh] max-w-5xl flex-col px-4 pb-4 pt-5 md:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="xeno-btn">
          <ArrowLeft size={12} /> Home
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase tracking-wide">
          Comms<span className="text-[var(--xeno-a)]">.</span>
        </h1>
        <span className="w-16" />
      </header>

      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Channels">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRoom(r.id)}
            aria-pressed={room === r.id}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${room === r.id ? 'border-[var(--xeno-a)] bg-[var(--xeno-a)]/15 text-white' : 'border-white/15 text-white/60 hover:text-white'}`}
          >
            {r.icon} {r.name}
          </button>
        ))}
      </nav>
      <p className="mt-2 text-xs text-white/45">{meta.blurb}</p>

      <div ref={box} data-lenis-prevent className="xeno-glass mt-3 flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-white/40">Quiet skies. Start the conversation.</p>}
        {msgs.map((m) => (
          <div key={m.id} className="group">
            <p className="flex items-baseline gap-2 text-xs">
              <Link href={`/pilot/${m.handle}`} className="font-semibold text-[var(--xeno-a)] hover:underline">
                @{m.handle}
              </Link>
              <span className="text-white/30">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {profile && (
                <button type="button" onClick={() => void report(m.id)} aria-label="Report message" className="ml-auto text-white/25 opacity-0 transition hover:text-[var(--xeno-d)] group-hover:opacity-100 focus:opacity-100">
                  <Flag size={12} />
                </button>
              )}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/85">{m.body}</p>
          </div>
        ))}
      </div>

      {ready && !profile ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-sm text-white/60">Sign in to post. It keeps Comms free of bots and trolls.</p>
          <Link href="/signin?callbackUrl=/comms" className="xeno-btn !border-[var(--xeno-a)]">
            Sign in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder={room === 'live' ? 'What are you seeing? Shape, colour, movement, direction…' : 'Say something useful…'}
            aria-label="Message"
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--xeno-a)]/60 focus:outline-none"
          />
          <button type="submit" disabled={busy || text.trim().length < 2} className="grid h-12 w-12 place-items-center rounded-full bg-[var(--xeno-a)] text-black disabled:opacity-40" aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      )}
      <details className="mt-2 text-[11px] text-white/40">
        <summary className="cursor-pointer">Comms rules</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
    </main>
  );
}
