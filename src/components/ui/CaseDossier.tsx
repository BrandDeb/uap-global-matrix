'use client';

/**
 * src/components/ui/CaseDossier.tsx
 * ---------------------------------------------------------------------------
 * Intelligence dossier for a selected sighting:
 *   - gov/citizen provenance badge + credibility + co-witness count
 *   - media vault (declassified docs / sensor stills)
 *   - Gemini AI brief panel (generated via /api/ai/summarize-thread; cached
 *     server-side in uap_ai_briefs; gracefully disabled when no key)
 *   - "I saw this too" co-witness registration
 *   - live operator comment thread
 *
 * State is keyed by sighting id at the parent, so it resets per case.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { X, Send, MessageSquare, BrainCircuit, ShieldAlert, Eye, Lock } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { LiveSighting } from '@/lib/sightings';

interface IntelThread {
  readonly id: string;
  readonly operatorHandle: string;
  readonly intelText: string;
  readonly createdAt: string;
}

interface AiBrief {
  readonly summary: string;
  readonly threatAssessment: string;
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
  const { profile, signInWithGitHub } = useAuth();
  const [comments, setComments] = useState<IntelThread[]>([]);
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState('');
  const [aiBrief, setAiBrief] = useState<AiBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [coWitnessCount, setCoWitnessCount] = useState(0);
  const [coWitnessNote, setCoWitnessNote] = useState<string | null>(null);

  const sightingId = sighting?.id;

  useEffect(() => {
    if (!sightingId) return;
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    (async () => {
      const [threadRes, briefRes, countRes] = await Promise.all([
        supabase
          .from('uap_intel_threads')
          .select('*')
          .eq('sighting_id', sightingId)
          .order('created_at', { ascending: true }),
        supabase
          .from('uap_ai_briefs')
          .select('summary_text,threat_assessment')
          .eq('sighting_id', sightingId)
          .maybeSingle(),
        supabase
          .from('sighting_co_witnesses')
          .select('*', { count: 'exact', head: true })
          .eq('sighting_id', sightingId),
      ]);
      if (cancelled) return;
      if (threadRes.data) {
        setComments(threadRes.data.map((r) => toIntelThread(r as Record<string, unknown>)));
      }
      if (briefRes.data) {
        const b = briefRes.data as { summary_text?: string; threat_assessment?: string };
        setAiBrief({
          summary: String(b.summary_text ?? ''),
          threatAssessment: String(b.threat_assessment ?? 'LOW'),
        });
      }
      if (typeof countRes.count === 'number') setCoWitnessCount(countRes.count);
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

  // Verified operator handle when signed in; falls back to the anon input.
  const operatorHandle = profile?.operatorHandle ?? (handle.trim() || 'ANON_OPERATOR');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await onAddIntel(sighting.id, operatorHandle, message.trim());
    setMessage('');
  };

  const generateBrief = async () => {
    if (comments.length === 0) return;
    setLoadingBrief(true);
    setBriefError(null);
    try {
      const res = await fetch('/api/ai/summarize-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sightingId: sighting.id,
          caseTitle: sighting.title,
          comments: comments.map((c) => ({
            operator_handle: c.operatorHandle,
            intel_text: c.intelText,
          })),
        }),
      });
      const data = (await res.json()) as Partial<AiBrief> & { error?: string };
      if (!res.ok || !data.summary) {
        setBriefError(
          res.status === 503 ? 'AI offline — GEMINI_API_KEY not configured.' : data.error ?? 'Brief failed.',
        );
      } else {
        setAiBrief({ summary: data.summary, threatAssessment: data.threatAssessment ?? 'LOW' });
      }
    } catch (err: unknown) {
      setBriefError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setLoadingBrief(false);
    }
  };

  const registerCoWitness = async () => {
    const supabase = getSupabaseBrowserClient();
    const operator = operatorHandle;
    const { error } = await supabase
      .from('sighting_co_witnesses')
      .insert({ sighting_id: sighting.id, operator_handle: operator });
    if (!error) {
      setCoWitnessCount((n) => n + 1);
      setCoWitnessNote('Logged.');
    } else if (error.code === '23505') {
      setCoWitnessNote('Already logged under that handle.');
    } else {
      setCoWitnessNote(error.message);
    }
  };

  return (
    <div
      style={{ animation: 'dossier-in 0.2s ease-out' }}
      className="absolute right-4 top-4 z-50 flex max-h-[85vh] w-[430px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 text-zinc-100 shadow-2xl backdrop-blur-lg"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-800 bg-zinc-950/60 p-4">
        <div>
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400">
            {sighting.isGovDeclassified ? '🏛️ GOV_DECLASSIFIED' : '📡 CITIZEN_FEED'}
          </span>
          <h2 className="mt-1.5 text-sm font-bold text-zinc-200">{sighting.title}</h2>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 font-mono text-xs">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800/40 bg-zinc-950/40 p-2.5">
          <div>
            <span className="block text-[9px] text-zinc-500">CO-WITNESSES</span>
            <span className="flex items-center gap-1 font-bold text-zinc-300">
              <Eye className="text-emerald-400" size={12} /> {coWitnessCount} SIGNALS
            </span>
          </div>
          <div>
            <span className="block text-[9px] text-zinc-500">CREDIBILITY</span>
            <span className="font-bold text-emerald-400">{sighting.credibilityScore}%</span>
          </div>
        </div>

        {/* Summary */}
        <div>
          <span className="mb-1 block text-[9px] text-zinc-500">TRANSMISSION SUMMARY</span>
          <p className="font-sans text-xs leading-relaxed text-zinc-300">{sighting.description}</p>
        </div>

        <Link
          href={`/case/${sighting.id}`}
          className="block rounded border border-cyan-500/30 bg-cyan-500/5 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-500/10"
        >
          ⤢ Open full case file &amp; forum
        </Link>

        {/* Media vault */}
        {sighting.mediaGallery.length > 0 && (
          <div>
            <span className="mb-1.5 block text-[9px] text-zinc-500">ATTACHED SENSOR MEDIA VAULT</span>
            <div className="grid grid-cols-3 gap-2">
              {sighting.mediaGallery.map((media, i) => (
                <a
                  key={i}
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-video overflow-hidden rounded border border-zinc-800 bg-zinc-950"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.url}
                    alt="Telemetry"
                    className="h-full w-full object-cover opacity-60 transition group-hover:opacity-100"
                  />
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[8px] text-zinc-400">
                    {media.type}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Gemini AI brief */}
        <div className="space-y-2 rounded-lg border border-purple-500/20 bg-purple-950/10 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400">
              <BrainCircuit size={13} /> GEMINI COGNITIVE ANALYTICS
            </span>
            {comments.length > 0 && (
              <button
                onClick={generateBrief}
                disabled={loadingBrief}
                className="rounded border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-[9px] text-purple-300 transition hover:bg-purple-500/30 disabled:opacity-50"
              >
                {loadingBrief ? 'COMPUTING…' : aiBrief ? 'RE-RUN BRIEF' : 'RUN ANALYTICS BRIEF'}
              </button>
            )}
          </div>
          {aiBrief ? (
            <div className="space-y-1.5 font-sans text-[11px]">
              <p className="italic leading-relaxed text-purple-200/90">“{aiBrief.summary}”</p>
              <div className="flex items-center gap-1 font-mono text-[9px] font-bold text-amber-400">
                <ShieldAlert size={11} /> THREAT: {aiBrief.threatAssessment}
              </div>
            </div>
          ) : (
            <p className="font-sans text-[10px] text-zinc-600">
              {briefError ?? 'Run frontier analysis over the active comment thread.'}
            </p>
          )}
        </div>

        {/* Co-witness */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
          <div>
            <span className="block text-[9px] text-zinc-500">PROXIMITY VALIDATION</span>
            <span className="text-[11px] font-bold text-zinc-300">
              {coWitnessNote ?? 'Did you also spot this event?'}
            </span>
          </div>
          <button
            onClick={registerCoWitness}
            className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-emerald-500"
          >
            I Saw This Too
          </button>
        </div>

        {/* Thread */}
        <div className="space-y-2 border-t border-zinc-800 pt-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
            <MessageSquare className="text-emerald-500" size={13} />
            <span>OPERATOR ANALYSIS LOG ({comments.length})</span>
          </div>
          <div className="max-h-[140px] space-y-2 overflow-y-auto pr-1">
            {comments.map((c) => (
              <div key={c.id} className="rounded border border-zinc-800/50 bg-zinc-950/40 p-2">
                <div className="mb-0.5 flex justify-between text-[9px]">
                  <span className="font-bold text-emerald-500">@{c.operatorHandle}</span>
                  <span className="text-zinc-600">
                    {c.createdAt ? new Date(c.createdAt).toLocaleTimeString() : ''}
                  </span>
                </div>
                <p className="font-sans text-[11px] text-zinc-300">{c.intelText}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-1.5">
            {profile ? (
              <div className="flex items-center justify-between rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-1">
                <span className="font-mono text-[10px] text-emerald-400">
                  ✦ @{profile.operatorHandle} · {profile.operatorRank.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-[9px] text-zinc-500">REP {profile.reputationScore}</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Anonymous handle — or sign in for a verified ID"
                  value={handle}
                  maxLength={50}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[10px] text-zinc-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void signInWithGitHub()}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-zinc-700 bg-zinc-100/5 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-100/10"
                >
                  <Lock size={11} /> Sign in via GitHub for a verified identity
                </button>
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                placeholder="Broadcast telemetry observations…"
                value={message}
                maxLength={2000}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-950 py-1 pl-2 pr-8 font-sans text-[10px] text-zinc-300 focus:outline-none"
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
