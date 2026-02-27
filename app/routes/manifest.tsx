import type { LoaderFunctionArgs } from 'react-router';
import { parseSpaceName } from '~/lib/utils/token';

export async function loader({ params }: LoaderFunctionArgs) {
  const { spaceToken } = params;
  const spaceName = parseSpaceName(spaceToken || '');
  const displayName = spaceName || 'Vocab';

  const manifest = {
    id: `/spaces/${spaceToken}`,
    name: `${displayName}`,
    short_name: displayName,
    description: `单词本 - ${displayName}`,
    start_url: `/spaces/${spaceToken}`,
    scope: `/spaces/${spaceToken}`,
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
