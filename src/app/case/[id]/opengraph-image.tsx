import { ImageResponse } from 'next/og';
import { getSighting } from '@/lib/db/queries';
import { isUuid } from '@/lib/apiHelpers';
import { toLiveSighting } from '@/lib/sightings';
import { OG_SIZE, OgCard } from '@/lib/og/card';

export const alt = 'UAP case file';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Per-case share card: title, year · place, and a credibility meter. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = isUuid(id) ? await getSighting(id).catch(() => null) : null;
  const c = row ? toLiveSighting(row) : null;
  const year = c ? new Date(c.eventTimestamp).getUTCFullYear() : '';
  const cred = c?.credibilityScore ?? 0;
  // First sentence of the case summary, trimmed to fit two lines.
  const first = c?.description.split(/(?<=[.!?])\s/)[0] ?? '';
  const story = first.length > 150 ? `${first.slice(0, 147).trimEnd()}…` : first;
  const evidence = (c?.evidenceTypes ?? []).map((e) => e.replace(/_/g, ' '));
  return new ImageResponse(
    (
      <OgCard
        kicker={c?.isGovDeclassified ? 'GOV DECLASSIFIED' : 'CASE FILE'}
        title={<span style={{ display: 'flex', fontSize: (c?.title.length ?? 0) > 22 ? 72 : 92 }}>{c?.title ?? 'Unknown contact'}</span>}
        subtitle={c ? `${year} · ${c.locationName}` : 'Case not found, or classified.'}
        detail={
          c ? (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 22 }}>
              <div style={{ display: 'flex', fontSize: 26, lineHeight: 1.35, color: 'rgba(255,255,255,0.8)', maxWidth: 980 }}>
                “{story}”
              </div>
              {evidence.length > 0 && (
                <div style={{ display: 'flex', marginTop: 18 }}>
                  {evidence.map((e) => (
                    <div
                      key={e}
                      style={{
                        display: 'flex',
                        marginRight: 12,
                        padding: '6px 16px',
                        borderRadius: 999,
                        border: '2px solid rgba(94,255,216,0.6)',
                        color: '#5effd8',
                        fontSize: 18,
                        letterSpacing: 3,
                      }}
                    >
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : undefined
        }
        footer={
          <div style={{ display: 'flex', flexDirection: 'column', width: 620 }}>
            <span style={{ display: 'flex', fontSize: 22, letterSpacing: 6 }}>CREDIBILITY INDEX {cred}%</span>
            <div style={{ display: 'flex', marginTop: 12, height: 14, width: 620, borderRadius: 7, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', height: 14, width: (620 * cred) / 100, borderRadius: 7, background: 'linear-gradient(90deg,#a58bff,#5effd8)' }} />
            </div>
          </div>
        }
      />
    ),
    size,
  );
}
