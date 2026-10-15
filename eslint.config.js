// ESLint flat config for the whole monorepo (run per package via `npm run lint`).
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const APP = 'apps/resourcepackbuilder';

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
    'exe-test/',
    // Vendored shadcn components, kept as generated
    'packages/ui/src/components/',
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
    ignores: ['packages/core/**', `${APP}/electron/**`],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [`${APP}/**/*.{ts,tsx}`],
    extends: [nextPlugin.configs['core-web-vitals']],
    settings: { next: { rootDir: APP } },
  },

  // Node: Electron main process, build scripts and config files
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
