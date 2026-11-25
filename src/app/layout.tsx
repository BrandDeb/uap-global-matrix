import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono, Unbounded } from 'next/font/google';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import SmoothScroll from '@/components/fx/SmoothScroll';
import ThemeSync, { THEME_BOOT_SCRIPT } from '@/components/profile/ThemeSync';
import JsonLd from '@/components/JsonLd';
import ProfileSync from '@/components/profile/ProfileSync';
import SightingAlerts from '@/components/profile/SightingAlerts';
import { SITE_DESCRIPTION, SITE_URL, SOCIALS, X_HANDLE } from '@/lib/site';
import type { Viewport } from 'next';

const body = Space_Grotesk({ variable: '--font-body', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono-x', subsets: ['latin'] });
const display = Unbounded({ variable: '--font-display-x', subsets: ['latin'], weight: ['300', '500', '800'] });

export const viewport: Viewport = { themeColor: '#020208', colorScheme: 'dark' };

export const metadata: Metadata = {
  verification: { google: 'lopbklqTpN6wnK5N3Ii0jpS4YfBTnUaUdawK-crSvdQ' },
  metadataBase: new URL(SITE_URL),
  title: { default: 'UAP/MATRIX: the live UFO sighting map and archive', template: '%s · UAP/MATRIX' },
  description: SITE_DESCRIPTION,
  applicationName: 'UAP/MATRIX',
  keywords: [
    'UFO sightings map', 'UAP', 'unidentified anomalous phenomena', 'UFO archive', 'declassified UFO files',
    'Roswell', 'Tic Tac UFO', 'Phoenix Lights', 'report a UFO sighting', 'UFO game', 'alien', 'crop circles',
  ],
  category: 'science',
  authors: [{ name: 'Lowkee Studios' }],
  creator: 'Lowkee Studios',
  publisher: 'Lowkee Studios',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: { type: 'website', siteName: 'UAP/MATRIX', locale: 'en_GB', url: '/' },
  twitter: { card: 'summary_large_image', ...(X_HANDLE ? { site: X_HANDLE, creator: X_HANDLE } : {}) },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${body.variable} ${mono.variable} ${display.variable} h-full antialiased`}>
      <head>
        {/* Apply the saved theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': `${SITE_URL}/#org`,
                name: 'UAP/MATRIX',
                url: SITE_URL,
                logo: `${SITE_URL}/brand/uap-matrix-logo-512.png`,
                description: SITE_DESCRIPTION,
                ...(SOCIALS.length ? { sameAs: SOCIALS.map((x) => x.url) } : {}),
                founder: { '@type': 'Organization', name: 'Lowkee Studios' },
              },
              {
                '@type': 'WebSite',
                '@id': `${SITE_URL}/#site`,
                name: 'UAP/MATRIX',
                url: SITE_URL,
                publisher: { '@id': `${SITE_URL}/#org` },
                inLanguage: 'en',
              },
            ],
          }}
        />
        <ThemeSync />
        <ProfileSync />
        <SightingAlerts />
        <SmoothScroll />
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className: '!rounded-2xl !border-white/10 !bg-[#0a0818]/90 !font-mono !text-xs !backdrop-blur-xl',
          }}
        />
        <Analytics />
        <SpeedInsights />
        <div className="xeno-scan" aria-hidden />
      </body>
    </html>
  );
}
