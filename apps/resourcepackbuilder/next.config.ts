import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

/**
 * The bare `cn` import resolves to the UI package's configured merger, which knows the Workbench type steps
 * (`packages/ui/src/lib/cn.ts`). Subpaths such as `cn/config` stay with the package.
 */
const CN_MODULE = '../../packages/ui/src/lib/cn.ts';

const nextConfig: NextConfig = {
  // Static export: Electron serves the "out" folder through its app:// protocol.
  output: 'export',
  images: { unoptimized: true },
  // `*.dev.tsx` routes (the editor primitives page) exist under `next dev` only and are left out of the export.
  pageExtensions: process.env.NODE_ENV === 'production' ? ['tsx', 'ts'] : ['dev.tsx', 'tsx', 'ts'],
  turbopack: { resolveAlias: { cn: CN_MODULE } },
  webpack: (config: { resolve: { alias: Record<string, string> } }) => {
    config.resolve.alias['cn$'] = fileURLToPath(new URL(CN_MODULE, import.meta.url));
    return config;
  },
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
