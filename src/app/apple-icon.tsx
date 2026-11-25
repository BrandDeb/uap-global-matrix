import { ImageResponse } from 'next/og';
import { OgSaucer } from '@/lib/og/card';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon: the saucer mark on the void gradient. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 40%, #1a1240, #020208)',
        }}
      >
        <OgSaucer w={130} />
      </div>
    ),
    size,
  );
}
