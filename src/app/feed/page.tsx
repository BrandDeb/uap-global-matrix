'use client';

/**
 * src/app/feed/page.tsx
 * ---------------------------------------------------------------------------
 * Global Intel Feed — a scrolling social timeline aggregating the latest
 * citizen recon + declassified FOIA drops, with thread-activity counts.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, MessageSquare, Eye } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface FeedItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly eventTimestamp: string;
  readonly locationName: string;
  readonly isGovDeclassified: boolean;
  readonly credibilityScore: number;
  readonly threadCount: number;
}

function toFeedItem(row: Record<string, unknown>): FeedItem {
  const threads = row.uap_intel_threads;
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    eventTimestamp: String(row.event_timestamp ?? ''),
    locationName: String(row.location_name ?? ''),
    isGovDeclassified: row.is_gov_declassified === true,
    credibilityScore: row.credibility_score == null ? 0 : Number(row.credibility_score),
    threadCount: Array.isArray(threads) ? threads.length : 0,
  };
}

export default function GlobalIntelFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('uap_sightings')
        .select(
          'id,title,description,event_timestamp,location_name,is_gov_declassified,credibility_score,uap_intel_threads(id)',
        )
        .order('event_timestamp', { ascending: false })
        .limit(40);
      if (cancelled) return;
      if (!error && data) {
        setItems(data.map((r) => toFeedItem(r as Record<string, unknown>)));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
                <div className="flex items-center space-x-1.5 text-zinc-400">
                  <Eye className="text-zinc-600" size={14} />
                  <span>
                    LOCATION: <span className="text-zinc-300">{item.locationName}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <MessageSquare size={14} />
                  <span>ANALYST LOGS ({item.threadCount})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
