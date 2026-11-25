'use client';

/**
 * Checks for new sightings near you every 2 minutes while any UAP/MATRIX tab
 * is open, and shows a system notification for each one. Off by default;
 * enabled in Settings → Alerts.
 */
import { useEffect } from 'react';
import { loadAlerts, notify, saveAlerts } from '@/lib/alerts';

export default function SightingAlerts() {
  useEffect(() => {
    let timer: number | undefined;
    const tick = async () => {
      const p = loadAlerts();
      if (!p.on || p.lat === undefined || p.lon === undefined || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const q = new URLSearchParams({ lat: String(p.lat), lon: String(p.lon), km: String(p.km), since: p.since ?? new Date().toISOString() });
      const r = await fetch(`/api/alerts?${q}`, { cache: 'no-store' }).catch(() => null);
      if (!r?.ok) return;
      const d = (await r.json()) as { items: { id: string; title: string; location_name: string; km: number }[]; now: string };
      for (const s of d.items.slice(0, 3).reverse()) {
        await notify(`🛸 New sighting ${s.km} km away`, `${s.title} · ${s.location_name}`, `/case/${s.id}`);
      }
      saveAlerts({ ...loadAlerts(), since: d.now });
    };
    const start = () => {
      window.clearInterval(timer);
      if (!loadAlerts().on) return;
      navigator.serviceWorker?.register('/sw.js').catch(() => {});
      void tick();
      timer = window.setInterval(() => void tick(), 120_000);
    };
    start();
    window.addEventListener('uap-alerts-change', start);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('uap-alerts-change', start);
    };
  }, []);
  return null;
}
