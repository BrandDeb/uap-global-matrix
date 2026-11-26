import { ImageResponse } from 'next/og';
import { pilotByHandle } from '@/lib/db/queries';
import { OG_SIZE } from '@/lib/og/card';
import { rankOf, xpOf, type XpSource } from '@/lib/xp';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'UAP/MATRIX pilot ID card';

/** Pilot ID card: name, rank, XP, badges and stats. */
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await pilotByHandle(handle).catch(() => null);
  const prefs = (p?.prefs ?? {}) as XpSource & { name?: string; bio?: string; custom?: { skin?: string } | null };
  const xp = xpOf(prefs);
  const r = rankOf(xp);
  const skin = prefs.custom?.skin ?? '#7dffb0';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', padding: 56, background: 'radial-gradient(circle at 85% 15%, rgba(165,139,255,0.5), transparent 45%), radial-gradient(circle at 10% 90%, rgba(94,255,216,0.35), transparent 45%), #020208', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flex: 1, borderRadius: 40, border: '3px solid rgba(94,255,216,0.5)', padding: 48, gap: 48, alignItems: 'center', background: 'rgba(10,8,24,0.6)' }}>
          <div style={{ width: 260, height: 260, borderRadius: 130, background: '#1b3a2c', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 80px rgba(94,255,216,0.4)' }}>
            <div style={{ width: 170, height: 190, borderRadius: '50% 50% 45% 45%', background: skin, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <div style={{ width: 46, height: 70, borderRadius: 30, background: '#06060c', transform: 'rotate(-20deg)' }} />
              <div style={{ width: 46, height: 70, borderRadius: 30, background: '#06060c', transform: 'rotate(20deg)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: 24, letterSpacing: 8, color: '#5effd8' }}>PILOT ID · UAP/MATRIX</div>
            <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 1, marginTop: 12 }}>{(prefs.name || p?.operator_handle || handle).slice(0, 18)}</div>
            <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>{`@${p?.operator_handle ?? handle}`}</div>
            <div style={{ fontSize: 44, fontWeight: 800, marginTop: 28, color: '#a58bff' }}>{r.name.toUpperCase()}</div>
            <div style={{ display: 'flex', gap: 40, marginTop: 18, fontSize: 28, color: 'rgba(255,255,255,0.75)' }}>
              <span>{`${xp.toLocaleString()} XP`}</span>
              <span>{`${prefs.badges?.length ?? 0} badges`}</span>
              <span>{`${prefs.eggs?.length ?? 0}/8 secrets`}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
