'use client';

/**
 * src/components/archive/Archivist.tsx
 * Floating "Ask the Archivist" chat: suggested questions, a short history,
 * answers from /api/ai/ask (grounded in the archive). Mentions of archive case
 * titles become links to that case on the globe.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { ARCHIVE } from '@/lib/archive';

interface Msg {
  role: 'user' | 'model';
  text: string;
}

const SUGGESTIONS = [
  'What are the 3 best-documented cases, and why?',
  'How many alien civilisations might exist? (Drake equation)',
  'If aliens exist, why haven’t we heard from them?',
  'Where in our solar system could life exist?',
  'What really happened with the Nimitz “Tic Tac”?',
  'Which sightings were caught on radar AND by pilots?',
  'What were the WWII “foo fighters”?',
  'Which cases have physical trace evidence?',
  'Explain Project Blue Book in 60 seconds',
  'Most convincing case outside the USA?',
  'What’s the boring explanation for the Phoenix Lights?',
];

/** Turn exact archive titles inside an answer into globe links. */
function linkify(text: string): ReactNode[] {
  const titles = ARCHIVE.map((c) => c.title).sort((a, b) => b.length - a.length);
  const out: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length) {
    let hit: { i: number; t: string } | null = null;
    for (const t of titles) {
      const i = rest.indexOf(t);
      if (i >= 0 && (!hit || i < hit.i)) hit = { i, t };
    }
    if (!hit) {
      out.push(rest);
      break;
    }
    out.push(rest.slice(0, hit.i));
    const c = ARCHIVE.find((x) => x.title === hit!.t)!;
    out.push(
      <Link key={key++} href={`/matrix?case=${c.id}`} className="text-[var(--xeno-a)] underline decoration-dotted underline-offset-2">
        {hit.t}
      </Link>,
    );
    rest = rest.slice(hit.i + hit.t.length);
  }
  return out;
}

export default function Archivist() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', text }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const d = (await res.json()) as { answer?: string; error?: string };
      setMsgs((m) => [...m, { role: 'model', text: d.answer ?? `⚠ ${d.error ?? 'Something went wrong.'}` }]);
    } catch {
      setMsgs((m) => [...m, { role: 'model', text: '⚠ Signal lost. Check your connection and try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close the Archivist' : 'Ask the Archivist'}
        data-cursor="ASK"
        className="fixed bottom-24 right-4 z-[60] md:bottom-5 md:right-5 flex items-center gap-2 rounded-full bg-[var(--xeno-a)] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_40px_rgba(94,255,216,0.5)] transition hover:scale-105"
      >
        {open ? <X size={14} /> : <MessageCircle size={14} />} <span className={open ? '' : 'hidden sm:inline'}>{open ? 'Close' : 'Ask the Archivist'}</span>{!open && <span className="sm:hidden">Ask AI</span>}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Ask the Archivist"
          className="xeno-glass fixed bottom-40 right-3 z-[60] md:bottom-20 flex h-[min(620px,75svh)] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden !bg-[#0a0818]/95"
        >
          <header className="border-b border-white/10 px-5 py-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/40">UFO archive + space science · free AI</p>
            <h2 className="mt-1 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-extrabold">
              <Sparkles size={16} className="text-[var(--xeno-a)]" /> The Archivist
            </h2>
          </header>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-5 py-4" data-lenis-prevent>
            {msgs.length === 0 && (
              <>
                <p className="text-sm leading-relaxed text-white/65">
                  Ask me anything about the files, 59 documented cases from 1942 to 2026. I only answer from the
                  record, and I’ll tell you when the record goes quiet.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void ask(s)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-xs text-white/75 transition hover:border-[var(--xeno-a)]/50 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user' ? 'ml-8 bg-[var(--xeno-a)]/12 text-white' : 'mr-4 border border-white/10 bg-white/[0.03] text-white/85'
                }`}
              >
                {m.role === 'model' ? linkify(m.text) : m.text}
              </div>
            ))}
            {busy && <p className="animate-pulse font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Pulling the files…</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about a case, an era, a shape…"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--xeno-a)]/50 focus:outline-none"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="rounded-full bg-[var(--xeno-a)] p-2.5 text-black disabled:opacity-40">
              <Send size={14} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
