// ESLint flat config for the whole monorepo (run per package via `npm run lint`).
// Generated output is listed in .gitignore; keep these ignores in step with it and with .prettierignore.
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import fs from 'node:fs';
import path from 'node:path';
import tseslint from 'typescript-eslint';

const APP = 'apps/resourcepackbuilder';
/** TypeScript that runs in Node rather than the browser. */
const NODE_SOURCES = [`${APP}/electron/**`, 'packages/s3/**', 'packages/test-utils/**'];
/** Framework-free domain packages (no React, no DOM-only code). */
const DOMAIN_PACKAGES = ['utils', 'minecraft', 'core', 'export', 'sync', 'test-server', 'desktop-contract'].map(
  (name) => `packages/${name}/**`,
);

/**
 * Import boundaries: a workspace may only import the @resourcepackbuilder packages its package.json declares.
 * turbo refuses cyclic declarations, so imports between packages can only point one way. Inside core, the project
 * model (project/) must not import a target (nexo/, craftEngine/) or the target switch (targets/), which build on it,
 * the generic form DSL (form/) and the shared YAML helpers (yaml/) must not import a target either, so project/ may use
 * them, and the targets do not import each other.
 */
const WORKSPACES = ['packages', 'apps']
  .flatMap((root) => fs.readdirSync(path.join(import.meta.dirname, root)).map((dir) => `${root}/${dir}`))
  .filter((dir) => fs.existsSync(path.join(import.meta.dirname, dir, 'package.json')));
/** Imports of a core entry point (`nexo`, `targets` …) by relative path or package name. */
const coreImports = (...dirs) =>
  dirs.flatMap((dir) => [`**/${dir}`, `**/${dir}/**`, `@resourcepackbuilder/core/${dir}`, `@resourcepackbuilder/core/${dir}/**`]);
const PROJECT_IMPORTS_TARGET = {
  group: coreImports('nexo', 'craftEngine', 'targets'),
  message: 'The project model must not depend on a target (nexo/, craftEngine/ and targets/ build on project/).',
};
const FORM_IMPORTS_TARGET = {
  group: coreImports('nexo', 'craftEngine', 'targets'),
  message: 'The form DSL must not depend on a target (each target builds its FormSchema on form/).',
};
const YAML_IMPORTS_TARGET = {
  group: coreImports('nexo', 'craftEngine', 'targets'),
  message: 'The shared YAML helpers must not depend on a target (every target writes its YAML with them).',
};
/** A target may not import another target or the target switch (only targets/ knows them all). */
const targetImportsOther = (other) => ({
  group: coreImports(other, 'targets'),
  message: 'A target must not depend on another target or on targets/ (only targets/ imports every target).',
});
/**
 * The `cn` package's own merger does not know the Workbench type steps (it drops `text-meta` next to a text colour), so
 * every class merge goes through `@resourcepackbuilder/ui/cn`; only that module (packages/ui/src/lib/cn.ts) imports `cn`.
 */
const BARE_CN = {
  regex: '^cn(?:/|$)',
  message: 'Import cn from @resourcepackbuilder/ui/cn (or ./lib/cn inside packages/ui): the bare cn package does not know the type steps.',
};
const importBoundaries = WORKSPACES.flatMap((dir) => {
  const pkg = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, dir, 'package.json'), 'utf8'));
  const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies })
    .filter((name) => name.startsWith('@resourcepackbuilder/'))
    .map((name) => name.slice('@resourcepackbuilder/'.length));
  const undeclared = {
    regex: `^@resourcepackbuilder/(?!(?:${declared.join('|')})(?:/|$))`,
    message: `Not a dependency of ${pkg.name}: declare it in package.json, keeping the package graph one-directional.`,
  };
  const rule = (patterns) => ({ 'no-restricted-imports': ['error', { patterns: [...patterns, BARE_CN] }] });
  const blocks = [{ files: [`${dir}/**/*.{ts,tsx,mjs,js}`], rules: rule([undeclared]) }];
  if (dir === 'packages/ui') {
    blocks.push({ files: [`${dir}/src/lib/cn.ts`], rules: { 'no-restricted-imports': ['error', { patterns: [undeclared] }] } });
  }
  if (dir === 'packages/core') {
    blocks.push({ files: [`${dir}/src/project/**`], rules: rule([undeclared, PROJECT_IMPORTS_TARGET]) });
    blocks.push({ files: [`${dir}/src/form/**`], rules: rule([undeclared, FORM_IMPORTS_TARGET]) });
    blocks.push({ files: [`${dir}/src/yaml/**`], rules: rule([undeclared, YAML_IMPORTS_TARGET]) });
    blocks.push({ files: [`${dir}/src/nexo/**`], rules: rule([undeclared, targetImportsOther('craftEngine')]) });
    blocks.push({ files: [`${dir}/src/craftEngine/**`], rules: rule([undeclared, targetImportsOther('nexo')]) });
  }
  return blocks;
});

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
    ignores: [...DOMAIN_PACKAGES, ...NODE_SOURCES],
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
  // The renderer: a forgotten rejection is an unhandled error in the window (ignore one explicitly with `void`)
  {
    files: [`${APP}/src/**/*.{ts,tsx}`],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: path.join(import.meta.dirname, APP) } },
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
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
    files: ['**/*.mjs', '**/*.config.{js,ts,mjs}', ...DOMAIN_PACKAGES.map((glob) => `${glob}/*.test.ts`)],
    languageOptions: { globals: globals.node },
  },
  ...importBoundaries,
);
