/**
 * The shared class-name merger keeps the Workbench type steps as font sizes: a text colour after a step no longer drops
 * it, and a later size still replaces an earlier one. Its list of steps matches the `--text-*` sizes of styles.css.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cn, TYPE_STEPS } from '@resourcepackbuilder/ui/cn';

const STYLES = readFileSync(fileURLToPath(new URL('../../../../packages/ui/src/styles.css', import.meta.url)), 'utf8');

describe('cn with the Workbench type steps', () => {
  it('knows every type step of styles.css', () => {
    // The steps are the `--text-<name>: <n>px` sizes; `--text-sm` only resizes Tailwind's own step for shadcn
    const steps = [...STYLES.matchAll(/--text-([a-z]+):\s*\d+px;/g)].map((m) => m[1]).filter((name) => name !== 'sm');
    expect([...TYPE_STEPS].sort()).toEqual([...new Set(steps)].sort());
  });

  it('keeps a type step next to a text colour', () => {
    expect(cn('text-meta', 'text-muted-foreground')).toBe('text-meta text-muted-foreground');
    for (const step of TYPE_STEPS) {
      expect(cn(`text-${step}`, 'text-text')).toBe(`text-${step} text-text`);
      expect(cn('text-danger', `text-${step}`)).toBe(`text-danger text-${step}`);
    }
  });

  it('lets a later size replace an earlier one', () => {
    expect(cn('text-title', 'text-sm')).toBe('text-sm');
    expect(cn('text-base', 'text-title')).toBe('text-title');
    expect(cn('text-meta', 'text-label')).toBe('text-label');
  });

  it('still merges colours with each other', () => {
    expect(cn('text-text', 'text-muted-foreground')).toBe('text-muted-foreground');
  });
});
