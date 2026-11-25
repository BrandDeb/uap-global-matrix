import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono, Unbounded } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import SmoothScroll from '@/components/fx/SmoothScroll';

const body = Space_Grotesk({ variable: '--font-body', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono-x', subsets: ['latin'] });
const display = Unbounded({ variable: '--font-display-x', subsets: ['latin'], weight: ['300', '500', '800'] });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: { type: 'website', siteName: 'UAP/MATRIX' },
  twitter: { card: 'summary_large_image' },
  title: 'UAP Global Matrix — Xeno Signal Atlas',
  description: 'A living atlas of unidentified anomalous phenomena, mapped across the planet in real time.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SmoothScroll />
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className: '!rounded-2xl !border-white/10 !bg-[#0a0818]/90 !font-mono !text-xs !backdrop-blur-xl',
          }}
        />
        <div className="xeno-scan" aria-hidden />
      </body>
    </html>
  );
}
