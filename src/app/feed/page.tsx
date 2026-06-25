'use client';

/**
 * src/app/feed/page.tsx
 * ---------------------------------------------------------------------------
 * Global Intel Feed — scrolling social timeline (citizen recon + FOIA drops)
 * with per-card upvoting and a Trending Now strip (top-voted sightings).
 *
 * Voting is keyed on a stable per-browser operator id (see lib/operatorId); the
 * UNIQUE(sighting_id, operator_handle) constraint caps it to one vote per
 * identity. Real auth supersedes the anon id when configured.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, MessageSquare, Eye, ThumbsUp, Flame } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getOperatorId } from '@/lib/operatorId';

interface FeedItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly eventTimestamp: string;
  readonly locationName: string;
  readonly isGovDeclassified: boolean;
  readonly credibilityScore: number;
  readonly threadCount: number;
  readonly upvoteCount: number;
}

interface TrendingItem {
  readonly id: string;
  readonly title: string;
  readonly upvoteCount: number;
}

function toFeedItem(row: Record<string, unknown>): FeedItem {
  const threads = row.uap_intel_threads;
  const upvotes = row.uap_intel_upvotes;
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    eventTimestamp: String(row.event_timestamp ?? ''),
    locationName: String(row.location_name ?? ''),
    isGovDeclassified: row.is_gov_declassified === true,
    credibilityScore: row.credibility_score == null ? 0 : Number(row.credibility_score),
    threadCount: Array.isArray(threads) ? threads.length : 0,
    upvoteCount: Array.isArray(upvotes) ? upvotes.length : 0,
  };
}

export default function GlobalIntelFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadTrending = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.rpc('trending_sightings', { max_rows: 8 });
    if (Array.isArray(data)) {
      setTrending(
        data.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            id: String(row.id),
            title: String(row.title ?? ''),
            upvoteCount: Number(row.upvote_count ?? 0),
          };
        }),
      );
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('uap_sightings')
        .select(
          'id,title,description,event_timestamp,location_name,is_gov_declassified,credibility_score,uap_intel_threads(id),uap_intel_upvotes(id)',
        )
        .order('event_timestamp', { ascending: false })
        .limit(40);
      if (cancelled) return;
      if (!error && data) setItems(data.map((r) => toFeedItem(r as Record<string, unknown>)));
      await loadTrending();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTrending]);

  const upvote = useCallback(
    async (sightingId: string) => {
      if (voted.has(sightingId)) return;
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('uap_intel_upvotes')
        .insert({ sighting_id: sightingId, operator_handle: getOperatorId() });
      // 23505 = already voted under this id → still mark voted, no double count.
      if (!error || error.code === '23505') {
        setVoted((curr) => new Set(curr).add(sightingId));
        if (!error) {
          setItems((curr) =>
            curr.map((it) =>
              it.id === sightingId ? { ...it, upvoteCount: it.upvoteCount + 1 } : it,
            ),
          );
          void loadTrending();
        }
      }
    },
    [voted, loadTrending],
  );

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 font-mono text-emerald-400">
        <Radio className="mr-2 animate-pulse" size={20} /> SYNCHRONIZING INTEL STREAM…
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 p-6 font-mono text-zinc-100 selection:bg-emerald-500 selection:text-black">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-md">
          <div>
            <h1 className="text-xl font-bold tracking-wider text-zinc-100">
              GLOBAL_INTEL_FEED <span className="text-zinc-600">{'//'}</span> LIVE_STREAM
            </h1>
            <p className="mt-1 text-xs text-zinc-500">Decentralized anomaly network activity chronicle</p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
          >
            ← STRATEGIC GLOBE
          </Link>
        </div>

        {/* Trending */}
        {trending.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
              <Flame size={13} /> TRENDING NOW
            </div>
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <span
                  key={t.id}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-[10px] text-zinc-300"
                >
                  <ThumbsUp size={10} className="text-amber-400" /> {t.upvoteCount}
                  <span className="max-w-[180px] truncate text-zinc-400">{t.title}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stream */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col space-y-3 rounded-xl border border-zinc-900 bg-zinc-900/10 p-5 transition hover:border-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span
                    className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                      item.isGovDeclassified
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {item.isGovDeclassified ? '🏛️ Official FOIA' : '📡 Citizen Recon'}
                  </span>
                  <h2 className="mt-1.5 text-base font-bold text-zinc-200">{item.title}</h2>
                </div>
                <div className="text-right text-[10px] text-zinc-500">
                  <div>{new Date(item.eventTimestamp).toLocaleDateString()}</div>
                  <div className="mt-0.5 font-bold text-emerald-400">CRED: {item.credibilityScore}%</div>
                </div>
              </div>

              <p className="max-w-3xl font-sans text-xs leading-relaxed text-zinc-400 line-clamp-3">
                {item.description}
              </p>

              <div className="flex items-center space-x-6 border-t border-zinc-900 pt-3 text-[11px] text-zinc-500">
                <button
                  onClick={() => upvote(item.id)}
                  disabled={voted.has(item.id)}
                  className={`flex items-center space-x-1.5 transition ${
                    voted.has(item.id)
                      ? 'cursor-default text-amber-400'
                      : 'hover:text-amber-400'
                  }`}
                >
                  <ThumbsUp size={14} />
                  <span>UPVOTE ({item.upvoteCount})</span>
                </button>
                <div className="flex items-center space-x-1.5">
                  <MessageSquare size={14} />
                  <span>LOGS ({item.threadCount})</span>
                </div>
                <div className="flex items-center space-x-1.5 text-zinc-400">
                  <Eye className="text-zinc-600" size={14} />
                  <span className="text-zinc-300">{item.locationName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
