import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UAP/MATRIX — Xeno Signal Atlas',
    short_name: 'UAP/MATRIX',
    description: 'A live atlas of unidentified anomalous phenomena, plus an arcade.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020208',
    theme_color: '#020208',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
