/**
 * src/lib/og/card.tsx, shared layout for social preview images (1200×630),
 * rendered by next/og's ImageResponse (flexbox-only CSS subset).
 */
import type { ReactNode } from 'react';

export const OG_SIZE = { width: 1200, height: 630 };

export function OgCard({
  kicker,
  title,
  subtitle,
  detail,
  footer,
}: {
  kicker: string;
  title: ReactNode;
  subtitle?: string;
  detail?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        color: '#ffffff',
        background:
          'radial-gradient(circle at 80% 10%, rgba(165,139,255,0.45), transparent 45%), radial-gradient(circle at 10% 90%, rgba(94,255,216,0.35), transparent 45%), #020208',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, letterSpacing: 8, color: 'rgba(255,255,255,0.6)' }}>
        <span style={{ display: 'flex' }}>
          UAP<span style={{ color: '#5effd8' }}>/</span>MATRIX
        </span>
        <span style={{ display: 'flex', color: '#ff5ec8' }}>{kicker}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: -2, textTransform: 'uppercase' }}>{title}</div>
        {subtitle && <div style={{ display: 'flex', marginTop: 24, fontSize: 32, color: 'rgba(255,255,255,0.65)' }}>{subtitle}</div>}
        {detail}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 24, color: 'rgba(255,255,255,0.5)' }}>
        {footer ?? <span style={{ display: 'flex' }}>The sky is talking.</span>}
        <OgSaucer w={170} />
      </div>
    </div>
  );
}

/** Flat saucer mark drawn with divs (no emoji font fetch at build time). */
export function OgSaucer({ w }: { w: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: w }}>
      <div style={{ display: 'flex', width: w * 0.42, height: w * 0.22, borderRadius: `${w}px ${w}px 0 0`, background: 'rgba(94,255,216,0.55)' }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          width: w,
          height: w * 0.24,
          borderRadius: w,
          background: 'linear-gradient(180deg,#e6e9f5,#6b7290)',
          padding: `0 ${w * 0.08}px`,
        }}
      >
        {['#ff5ec8', '#5effd8', '#ffffff', '#5effd8', '#ff5ec8'].map((c, i) => (
          <div key={i} style={{ display: 'flex', width: w * 0.06, height: w * 0.06, borderRadius: w, background: c }} />
        ))}
      </div>
      <div style={{ display: 'flex', width: w * 0.7, height: w * 0.5, background: 'linear-gradient(180deg,rgba(94,255,216,0.6),rgba(94,255,216,0))', clipPath: 'polygon(30% 0,70% 0,100% 100%,0 100%)' }} />
    </div>
  );
}
