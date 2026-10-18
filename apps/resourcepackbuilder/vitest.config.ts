/**
 * Vitest setup of the app: the bare `cn` import resolves to the UI package's configured merger, as in
 * `next.config.ts`, so tests render the same classes as the app.
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [{ find: /^cn$/, replacement: fileURLToPath(new URL('../../packages/ui/src/lib/cn.ts', import.meta.url)) }],
  },
});
