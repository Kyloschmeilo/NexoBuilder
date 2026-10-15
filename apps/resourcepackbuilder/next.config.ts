import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export: Electron serves the "out" folder through its app:// protocol.
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@resourcepackbuilder/core', '@resourcepackbuilder/ui', '@resourcepackbuilder/preview'],
};

export default nextConfig;
