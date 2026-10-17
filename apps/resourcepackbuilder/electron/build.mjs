// Bundles the Electron main process and the preload script (electron/src) into CommonJS files in electron/dist,
// including the workspace packages they import (core, desktop-contract, i18n, sync, test-server) and their
// dependencies, so the packaged app needs no node_modules. Run by `npm run build:electron` (part of `build`).
import { build } from 'esbuild';
import path from 'node:path';

const dir = import.meta.dirname;

await build({
  entryPoints: { main: path.join(dir, 'src/main.ts'), preload: path.join(dir, 'src/preload.ts') },
  outdir: path.join(dir, 'dist'),
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  // Electron 44 runs Node 24
  target: 'node24',
  external: ['electron'],
  sourcemap: 'linked',
  legalComments: 'none',
  logLevel: 'warning',
});
