'use client';

/**
 * src/components/ui/CaseDossier.tsx
 * ---------------------------------------------------------------------------
 * Intelligence dossier + live community thread for a selected sighting.
 *
 * Telemetry comes from the normalized {@link LiveSighting} (camelCase). The
 * thread loads `uap_intel_threads` for this sighting and subscribes to a
 * per-case realtime channel (filtered by sighting_id) so new operator intel
 * appears instantly. Posting is delegated to the parent via `onAddIntel`.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { LiveSighting } from '@/lib/sightings';

interface IntelThread {
  readonly id: string;
  readonly operatorHandle: string;
  readonly intelText: string;
  readonly createdAt: string;
}

function toIntelThread(row: Record<string, unknown>): IntelThread {
  return {
    id: String(row.id),
    operatorHandle: String(row.operator_handle ?? 'ANON_OPERATOR'),
    intelText: String(row.intel_text ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

interface CaseDossierProps {
  readonly sighting: LiveSighting | null;
  readonly onClose: () => void;
  readonly onAddIntel: (
    sightingId: string,
    handle: string,
    text: string,
  ) => Promise<{ error: { message: string } | null }>;
}

export default function CaseDossier({ sighting, onClose, onAddIntel }: CaseDossierProps) {
  const [comments, setComments] = useState<IntelThread[]>([]);
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState('');

  const sightingId = sighting?.id;

  useEffect(() => {
    if (!sightingId) return;
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('uap_intel_threads')
        .select('*')
        .eq('sighting_id', sightingId)
        .order('created_at', { ascending: true });
      if (!cancelled && data) {
        setComments(data.map((r) => toIntelThread(r as Record<string, unknown>)));
      }
    })();

    const channel = supabase
      .channel(`case-thread-${sightingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'uap_intel_threads',
          filter: `sighting_id=eq.${sightingId}`,
        },
        (payload) => {
          if (cancelled) return;
          const thread = toIntelThread(payload.new as Record<string, unknown>);
          setComments((curr) => (curr.some((c) => c.id === thread.id) ? curr : [...curr, thread]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sightingId]);

  if (!sighting) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const operator = handle.trim() || 'ANON_OPERATOR';
    await onAddIntel(sighting.id, operator, message.trim());
    setMessage('');
  };

  return (
    <div
      style={{ animation: 'dossier-in 0.2s ease-out' }}
      className="absolute right-4 top-4 z-50 flex max-h-[85vh] w-[420px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 text-zinc-100 shadow-2xl backdrop-blur-lg"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-800 bg-zinc-950/60 p-4">
        <div>
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-400">
            {sighting.sourceTier.replace(/_/g, ' ')}
          </span>
          <h2 className="mt-1.5 font-mono text-base font-bold text-zinc-200">{sighting.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-zinc-500 transition hover:text-zinc-200"
          aria-label="Close dossier"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 font-mono text-xs">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-800/40 bg-zinc-950/30 p-3">
          <div>
            <span className="block text-[10px] uppercase text-zinc-500">Coordinate Loc</span>
            <span className="text-zinc-300">{sighting.locationName}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-zinc-500">Credibility Index</span>
            <span className="font-bold text-emerald-400">{sighting.credibilityScore}%</span>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[10px] uppercase text-zinc-500">
            Declassified Transmission
          </span>
          <p className="font-sans text-sm leading-relaxed text-zinc-300">{sighting.description}</p>
        </div>

        {/* Community thread */}
        <div className="flex min-h-[180px] flex-col border-t border-zinc-800 pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
            <MessageSquare size={14} className="text-emerald-500" />
            <span>OPERATOR ANALYSIS LOG ({comments.length})</span>
          </div>

          <div className="mb-3 max-h-[160px] flex-1 space-y-2.5 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <div className="py-4 text-center text-[11px] italic text-zinc-600">
                No operator updates on this target yet…
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded border border-zinc-800/50 bg-zinc-950/40 p-2">
                  <div className="mb-0.5 flex justify-between text-[10px]">
                    <span className="font-bold text-emerald-500">@{c.operatorHandle}</span>
                    <span className="text-zinc-600">
                      {c.createdAt ? new Date(c.createdAt).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-zinc-300">{c.intelText}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-auto space-y-1.5">
            <input
              type="text"
              placeholder="Operator handle (e.g. Sentinel_01)"
              value={handle}
              maxLength={50}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-200 focus:border-zinc-700 focus:outline-none"
            />
            <div className="relative">
              <input
                type="text"
                placeholder="Broadcast observation…"
                value={message}
                maxLength={2000}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-950 py-1 pl-2 pr-8 font-sans text-[11px] text-zinc-200 focus:border-zinc-700 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-emerald-400"
                aria-label="Send intel"
              >
                <Send size={12} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
