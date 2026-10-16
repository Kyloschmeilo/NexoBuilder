// ESLint flat config for the whole monorepo (run per package via `npm run lint`).
// Generated output is listed in .gitignore; keep these ignores in step with it and with .prettierignore.
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import path from 'node:path';
import tseslint from 'typescript-eslint';

const APP = 'apps/resourcepackbuilder';
/** TypeScript that runs in Node rather than the browser. */
const NODE_SOURCES = [`${APP}/electron/**`, 'packages/s3/**'];

export default defineConfig(
  globalIgnores([
    '**/node_modules/',
    '**/.next/',
    '**/.turbo/',
    '**/out/',
    '**/release/',
    '**/dist/',
    '**/coverage/',
    '**/next-env.d.ts',
    '**/.playwright-mcp/',
    'exe-test/',
    // Vendored shadcn components, hooks and helpers, kept as generated
    'packages/ui/src/components/',
    'packages/ui/src/hooks/',
    'packages/ui/src/lib/',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  // React code (app and the React packages)
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['packages/core/**', 'packages/desktop-contract/**', ...NODE_SOURCES],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [`${APP}/**/*.{ts,tsx}`],
    extends: [nextPlugin.configs['core-web-vitals']],
    // Absolute, because lint runs inside each workspace
    settings: { next: { rootDir: path.join(import.meta.dirname, APP) } },
    rules: {
      // Images are data URLs in a static export: next/image cannot optimise them
      '@next/next/no-img-element': 'off',
    },
  },

  // Node: Electron main process and preload script, the S3 package (bundled into the main process)
  {
    files: NODE_SOURCES,
    languageOptions: { globals: globals.node },
  },
  // CommonJS scripts
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // `const crypto = require('node:crypto')` shadows the global on purpose
      'no-redeclare': ['error', { builtinGlobals: false }],
    },
  },
  {
    // Drives the packaged app with Playwright; callbacks passed to `evaluate` run in the page
    files: [`${APP}/scripts/test-windows-exe.cjs`],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.mjs', '**/*.config.{js,ts,mjs}', 'packages/core/**/*.test.ts'],
    languageOptions: { globals: globals.node },
  },
);
