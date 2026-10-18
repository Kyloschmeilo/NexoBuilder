// Runs the plugin check (verify/main.ts): bundles it with esbuild, because the workspace packages ship TypeScript
// sources, and starts the bundle with the given arguments.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const outfile = path.join(import.meta.dirname, '..', 'node_modules', '.tmp', 'verify-plugins.mjs');
await build({
  entryPoints: [path.join(import.meta.dirname, 'main.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  logLevel: 'warning',
  // Bundled CommonJS dependencies (jszip) call require
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
});
await import(pathToFileURL(outfile).href);
