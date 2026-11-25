import { ImageResponse } from 'next/og';
import { OG_SIZE, OgCard } from '@/lib/og/card';

export const alt = 'UAP/MATRIX, We come in peace (mostly)';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        kicker="LIVE ATLAS · ARCADE"
        title={
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ display: 'flex' }}>We come</span>
            <span style={{ display: 'flex', color: '#5effd8' }}>
              in peace<span style={{ color: '#ff5ec8' }}>*</span>
            </span>
          </div>
        }
        subtitle="Every UFO sighting since 1947, geotagged, scored, argued about. Plus cows."
        footer={<span style={{ display: 'flex' }}>*mostly</span>}
      />
    ),
    size,
  );
}
