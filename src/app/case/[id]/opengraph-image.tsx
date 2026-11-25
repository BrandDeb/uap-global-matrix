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
  return new ImageResponse(
    (
      <OgCard
        kicker={c?.isGovDeclassified ? 'GOV DECLASSIFIED' : 'CASE FILE'}
        title={<span style={{ display: 'flex', fontSize: (c?.title.length ?? 0) > 22 ? 72 : 92 }}>{c?.title ?? 'Unknown contact'}</span>}
        subtitle={c ? `${year} · ${c.locationName}` : 'Case not found — or classified.'}
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
