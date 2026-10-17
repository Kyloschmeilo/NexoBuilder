import { describe, expect, it } from 'vitest';
import { createGlyph } from '../project/media/glyph';
import { PACK_TARGETS } from '../project/target';
import { formFor, glyphTagFor } from './index';

describe('formFor', () => {
  for (const target of PACK_TARGETS) {
    it(`gives ${target} its own form, with no property on a managed path`, () => {
      const form = formFor(target);
      expect(form.target).toBe(target);
      const groups = new Set(form.groups.map((group) => group.id));
      expect(form.tabs.filter((tab) => !groups.has(tab.group))).toEqual([]);
      const paths = form.properties.flatMap((p) => (p.storage === 'config' ? [p.path.join('.')] : []));
      const managed = paths.filter((path) => form.managedPaths.some((m) => path === m || path.startsWith(`${m}.`)));
      expect(managed).toEqual([]);
    });
  }
});

describe('glyphTagFor', () => {
  it('names the first cell of a multi-bitmap glyph for both targets', () => {
    const single = createGlyph('g_1', 'smile', null);
    const grid = { ...createGlyph('g_2', 'icons', null), rows: 2, columns: 3 };
    expect(glyphTagFor({ namespace: 'pack', target: 'craftengine' }, single)).toBe('<image:pack:smile>');
    expect(glyphTagFor({ namespace: 'pack', target: 'craftengine' }, grid)).toBe('<image:pack:icons:0:0>');
    expect(glyphTagFor({ namespace: 'pack', target: 'nexo' }, grid)).toBe('<glyph:icons:1>');
  });
});
