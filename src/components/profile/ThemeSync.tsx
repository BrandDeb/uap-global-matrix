'use client';

/** Keeps <html data-theme> in sync with the saved preference (and the OS when "Auto"). */
import { useEffect } from 'react';
import { applyTheme, useLocalProfile } from '@/lib/profile';

export const THEME_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('uap-profile')||'{}').theme||'dark';var d=p==='dark'||(p==='system'&&!matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}`;

export default function ThemeSync() {
  const { theme } = useLocalProfile();
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => applyTheme('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [theme]);
  return null;
}
