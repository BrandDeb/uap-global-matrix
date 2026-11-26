'use client';

/** Trade offers: propose one of your cards for one of theirs; accept / decline / cancel. */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import XenoCard from './XenoCard';
import { CARD_BY_ID, CARDS } from '@/lib/cards';
import { refreshCards, useCollection } from '@/lib/collection';

interface Trade {
  id: number;
  from_handle: string;
  to_handle: string;
  give_card: string;
  want_card: string;
  status: string;
  mine: boolean;
}

export default function TradesView() {
  const c = useCollection();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [to, setTo] = useState('');
  const [give, setGive] = useState('');
  const [want, setWant] = useState('');
  const load = () =>
    fetch('/api/cards/trades', { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ trades?: Trade[] }>)
      .then((d) => setTrades(d.trades ?? []))
      .catch(() => {});
  useEffect(() => {
    void load();
  }, []);

  const offer = async () => {
    const r = await fetch('/api/cards/trades', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to, give, want }) });
    const d = (await r.json()) as { error?: string };
    toast(r.ok ? 'Offer sent 📨' : (d.error ?? 'Could not send offer.'));
    if (r.ok) void load();
  };
  const respond = async (id: number, action: 'accept' | 'decline' | 'cancel') => {
    const r = await fetch('/api/cards/trades', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action }) });
    const d = (await r.json()) as { error?: string };
    toast(r.ok ? (action === 'accept' ? '🤝 Trade complete!' : 'Done.') : (d.error ?? 'Failed.'));
    void load();
    void refreshCards();
  };

  const mine = CARDS.filter((d) => c.owned[d.id]);
  const sel = 'w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white';
  return (
    <section className="grid gap-8 md:grid-cols-2">
      <div className="xeno-glass p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold uppercase">New offer</h2>
        <p className="mt-1 text-xs text-white/50">Swap one copy of your card for one of theirs. Both sides must agree; the swap is instant and safe.</p>
        <label className="mt-4 block text-xs text-white/55">
          Pilot handle
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@NeonComet_4821" className={`${sel} mt-1`} />
        </label>
        <label className="mt-3 block text-xs text-white/55">
          You give
          <select value={give} onChange={(e) => setGive(e.target.value)} className={`${sel} mt-1`}>
            <option value="">Pick one of your cards…</option>
            {mine.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.no} {d.name} ({d.rarity}) ×{(c.owned[d.id]?.shards ?? 0) + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs text-white/55">
          You want
          <select value={want} onChange={(e) => setWant(e.target.value)} className={`${sel} mt-1`}>
            <option value="">Pick the card you want…</option>
            {CARDS.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.no} {d.name} ({d.rarity})
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={!to || !give || !want} onClick={() => void offer()} className="mt-4 rounded-full bg-[var(--xeno-a)] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black disabled:opacity-40">
          Send offer
        </button>
      </div>
      <div>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">Offers</h2>
        {trades.length === 0 && <p className="mt-3 text-sm text-white/45">No offers yet.</p>}
        <ul className="mt-3 space-y-3">
          {trades.map((t) => (
            <li key={t.id} className="rounded-2xl border border-white/10 p-3">
              <p className="text-xs text-white/55">
                {t.mine ? `You → @${t.to_handle}` : `@${t.from_handle} → you`} · <span className="uppercase">{t.status}</span>
              </p>
              <div className="mt-2 flex items-center gap-3">
                <XenoCard def={CARD_BY_ID[t.give_card]} size={70} />
                <span className="text-xl">⇄</span>
                <XenoCard def={CARD_BY_ID[t.want_card]} size={70} />
                <div className="ml-auto flex flex-col gap-2">
                  {t.status === 'open' && !t.mine && (
                    <>
                      <button type="button" onClick={() => void respond(t.id, 'accept')} className="rounded-full bg-[var(--xeno-a)] px-3 py-1 text-xs font-bold text-black">Accept</button>
                      <button type="button" onClick={() => void respond(t.id, 'decline')} className="rounded-full border border-white/20 px-3 py-1 text-xs">Decline</button>
                    </>
                  )}
                  {t.status === 'open' && t.mine && (
                    <button type="button" onClick={() => void respond(t.id, 'cancel')} className="rounded-full border border-white/20 px-3 py-1 text-xs">Cancel</button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                {t.mine ? 'You give' : 'They give'} {CARD_BY_ID[t.give_card]?.name} · {t.mine ? 'you get' : 'you give'} {CARD_BY_ID[t.want_card]?.name}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
