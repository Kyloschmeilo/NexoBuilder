/**
 * The class-name merger keeps the Workbench type steps as font sizes: a text colour after a step no longer drops it,
 * and a later size still replaces an earlier one. The test imports the bare `cn`, so it also checks that the app
 * resolves it to the configured merger.
 */
import { describe, expect, it } from 'vitest';
import { cn } from 'cn';

/** The type steps of styles.css (`--text-micro` … `--text-page`). */
const TYPE_STEPS = ['micro', 'meta', 'label', 'body', 'title', 'page'];

describe('cn with the Workbench type steps', () => {
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
