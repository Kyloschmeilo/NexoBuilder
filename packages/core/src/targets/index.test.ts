import { describe, expect, it } from 'vitest';
import { PACK_TARGETS } from '../project/target';
import { formFor } from './index';

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
