'use client';

/** Nearby-sighting alert settings (stored on this device only). */
export interface AlertPrefs {
  on: boolean;
  km: number;
  lat?: number;
  lon?: number;
  since?: string;
}
export const ALERT_KEY = 'uap-alerts';

export function loadAlerts(): AlertPrefs {
  try {
    return { on: false, km: 250, ...(JSON.parse(localStorage.getItem(ALERT_KEY) ?? 'null') ?? {}) };
  } catch {
    return { on: false, km: 250 };
  }
}
export function saveAlerts(p: AlertPrefs) {
  try {
    localStorage.setItem(ALERT_KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event('uap-alerts-change'));
}

export async function notify(title: string, body: string, url: string) {
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (reg) await reg.showNotification(title, { body, icon: '/brand/uap-matrix-logo-512.png', badge: '/icon.svg', data: { url }, tag: url });
  else new Notification(title, { body, icon: '/brand/uap-matrix-logo-512.png' });
}
