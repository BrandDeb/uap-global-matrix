'use client';

/**
 * src/components/ui/CaseThread.tsx
 * ---------------------------------------------------------------------------
 * Full case-page discussion: one-level threaded replies over uap_intel_threads,
 * live via realtime. Posts as the verified profile handle when signed in, else
 * a stable per-browser anon id.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getOperatorId } from '@/lib/operatorId';

interface ThreadRow {
  readonly id: string;
  readonly operatorHandle: string;
  readonly intelText: string;
  readonly createdAt: string;
  readonly parentId: string | null;
}

function toRow(r: Record<string, unknown>): ThreadRow {
  return {
    id: String(r.id),
    operatorHandle: String(r.operator_handle ?? 'ANON_OPERATOR'),
    intelText: String(r.intel_text ?? ''),
    createdAt: String(r.created_at ?? ''),
    parentId: typeof r.parent_id === 'string' ? r.parent_id : null,
  };
}

interface CaseThreadProps {
  readonly sightingId: string;
}

export default function CaseThread({ sightingId }: CaseThreadProps) {
  const { profile, signInWithGitHub } = useAuth();
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    let cancelled = false;
    let cursor: string | null = null;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const q = cursor ? `?since=${encodeURIComponent(cursor)}` : '';
        const res = await fetch(`/api/sightings/${sightingId}/intel${q}`, { cache: 'no-store' });
        if (res.ok && !cancelled) {
          const d = (await res.json()) as { rows: Record<string, unknown>[]; serverTime: string };
          const fresh = d.rows.map(toRow);
          setRows((curr) => {
            const known = new Set(curr.map((x) => x.id));
            return [...curr, ...fresh.filter((x) => !known.has(x.id))];
          });
          cursor = d.serverTime;
        }
      } catch {
        /* offline */
      }
      if (!cancelled) timer = window.setTimeout(poll, 6000);
    };
    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sightingId]);

  const handle = profile?.operatorHandle ?? getOperatorId();

  const post = async (intelText: string, parentId: string | null) => {
    const t = intelText.trim();
    if (!t) return;
    const res = await fetch(`/api/sightings/${sightingId}/intel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: t, parentId, handle }),
    });
    if (res.ok) {
      const row = toRow((await res.json()) as Record<string, unknown>);
      setRows((curr) => (curr.some((x) => x.id === row.id) ? curr : [...curr, row]));
    }
  };

  const tops = rows.filter((r) => !r.parentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
          Operator Discussion ({rows.length})
        </h3>
        <span className="font-mono text-[10px] text-zinc-500">
          posting as <span className="text-emerald-400">@{handle}</span>
          {!profile && (
            <button
              onClick={() => void signInWithGitHub()}
              className="ml-2 text-cyan-400 hover:underline"
            >
              verify via GitHub
            </button>
          )}
        </span>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await post(text, null);
          setText('');
        }}
        className="relative"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Add your analysis…"
          className="w-full rounded border border-zinc-800 bg-zinc-950 py-2 pl-3 pr-9 font-sans text-sm text-zinc-200 focus:border-zinc-700 focus:outline-none"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-emerald-400"
          aria-label="Post"
        >
          <Send size={14} />
        </button>
      </form>

      <div className="space-y-3">
        {tops.length === 0 && (
          <p className="font-mono text-xs text-zinc-600">No analysis logged yet. Be the first operator.</p>
        )}
        {tops.map((t) => (
          <div key={t.id} className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
            <div className="mb-1 flex justify-between font-mono text-[10px]">
              <span className="font-bold text-emerald-400">@{t.operatorHandle}</span>
              <span className="text-zinc-600">
                {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
              </span>
            </div>
            <p className="font-sans text-sm text-zinc-300">{t.intelText}</p>

            <div className="mt-2 space-y-2 border-l border-zinc-800 pl-3">
              {rows
                .filter((r) => r.parentId === t.id)
                .map((rep) => (
                  <div key={rep.id}>
                    <div className="flex justify-between font-mono text-[9px]">
                      <span className="font-bold text-cyan-400">↳ @{rep.operatorHandle}</span>
                      <span className="text-zinc-600">
                        {rep.createdAt ? new Date(rep.createdAt).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-zinc-400">{rep.intelText}</p>
                  </div>
                ))}

              {replyTo === t.id ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await post(replyText, t.id);
                    setReplyText('');
                    setReplyTo(null);
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    maxLength={2000}
                    placeholder="Reply…"
                    className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-sans text-xs text-zinc-300 focus:outline-none"
                  />
                  <button type="submit" className="font-mono text-[10px] text-emerald-400">
                    SEND
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setReplyTo(t.id)}
                  className="font-mono text-[9px] text-zinc-500 hover:text-zinc-300"
                >
                  ↳ reply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
