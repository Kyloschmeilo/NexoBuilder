/**
 * Every issue code and CoreError code core can emit is a message key in the `issues` namespace.
 * This test scans core's sources for code literals and checks each one exists in the English
 * catalogue (the parity test of the i18n package keeps German in line).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type MessageTree = { [key: string]: string | MessageTree };

const SRC = new URL('../', import.meta.url);

/** First segments of the keys in `issues` that core uses for issue and error codes */
const CODE_GROUPS = [
  'context',
  'plan',
  'selection',
  'model',
  'texture',
  'sync',
  'file',
  'project',
  'recipe',
  'glyph',
  'sound',
  'painting',
  'yaml',
];

/** Literals that look like codes but are not (file names) */
const NOT_CODES = new Set(['project.json']);

const CODE_LITERAL = new RegExp(`['\`]((?:${CODE_GROUPS.join('|')})\\.[A-Za-z][A-Za-z0-9_.]*)['\`]`, 'g');

function catalogue(): MessageTree {
  const url = new URL('../../../i18n/src/messages/en/issues.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as MessageTree;
}

function lookup(tree: MessageTree, key: string): unknown {
  let node: unknown = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as MessageTree)[part];
  }
  return node;
}

function sourceFiles(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return sourceFiles(new URL(`${entry.name}/`, dir));
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [new URL(entry.name, dir)] : [];
  });
}

/** Code literals in core's sources, e.g. `code: 'plan.duplicateFile'`, `add('info', 'plan.missingModel')`, `new CoreError('…')` */
function codesInSources(): Map<string, string> {
  const codes = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(CODE_LITERAL)) {
      // Template literals with placeholders (`plan.${x}`) are not codes on their own
      if (!match[1].includes('${') && !NOT_CODES.has(match[1])) codes.set(match[1], file.pathname.split('/src/')[1]);
    }
  }
  return codes;
}

describe('issue codes', () => {
  const messages = catalogue();
  const codes = codesInSources();

  it('finds the codes in the sources', () => {
    expect(codes.has('plan.missingModel')).toBe(true);
    expect(codes.has('model.invalidBbmodel')).toBe(true);
    expect(codes.has('sync.otherProjectInFolder')).toBe(true);
    expect(codes.size).toBeGreaterThan(80);
  });

  it('has a message for every code core emits', () => {
    const missing = [...codes].filter(([code]) => typeof lookup(messages, code) !== 'string').map(([code, file]) => `${code} (${file})`);
    expect(missing).toEqual([]);
  });
});
