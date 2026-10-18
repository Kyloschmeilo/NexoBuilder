import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export: Electron serves the "out" folder through its app:// protocol.
  output: 'export',
  images: { unoptimized: true },
  // `*.dev.tsx` routes (the editor primitives page) exist under `next dev` only and are left out of the export.
  pageExtensions: process.env.NODE_ENV === 'production' ? ['tsx', 'ts'] : ['dev.tsx', 'tsx', 'ts'],
  transpilePackages: [
    '@resourcepackbuilder/i18n',
    '@resourcepackbuilder/core',
    '@resourcepackbuilder/desktop-contract',
    '@resourcepackbuilder/ui',
    '@resourcepackbuilder/minecraft',
    '@resourcepackbuilder/export',
    '@resourcepackbuilder/sync',
    '@resourcepackbuilder/test-server',
    '@resourcepackbuilder/utils',
    '@resourcepackbuilder/preview',
  ],
};

export default nextConfig;
