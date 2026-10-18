/** Every feature group of both item forms has catalog categories, common entries and only known property ids. */
import { describe, expect, it } from 'vitest';
import { CE_CATALOG } from '../craftEngine/form/schema/catalog';
import { CRAFT_ENGINE_FORM } from '../craftEngine/form/schema';
import type { FormSchema } from '../form/types';
import { NEXO_CATALOG } from '../nexo/form/schema/catalog';
import { NEXO_FORM } from '../nexo/form/schema';

/** The groups whose catalog must be sorted into categories, per form. */
const CATEGORIZED: Array<[FormSchema, Record<string, unknown>, string[]]> = [
  [NEXO_FORM, NEXO_CATALOG, ['general', 'appearance', 'attributes', 'components', 'mechanics']],
  [CRAFT_ENGINE_FORM, CE_CATALOG, ['general', 'data', 'settings', 'blockSettings', 'model', 'itemBehavior']],
];

for (const [form, catalog, groups] of CATEGORIZED) {
  describe(`catalog metadata of the ${form.target} form`, () => {
    it('gives every property of the feature groups a category', () => {
      const missing = form.properties.filter((def) => groups.includes(def.group) && !def.category).map((def) => def.id);
      expect(missing).toEqual([]);
    });

    it('only names properties the form has', () => {
      const ids = new Set(form.properties.map((def) => def.id));
      expect(Object.keys(catalog).filter((id) => !ids.has(id))).toEqual([]);
    });

    it('marks some common entries and gives categories of at least two entries per group', () => {
      for (const group of groups) {
        const defs = form.properties.filter((def) => def.group === group);
        expect(
          defs.some((def) => def.common),
          group,
        ).toBe(true);
        expect(new Set(defs.map((def) => def.category)).size, group).toBeGreaterThan(1);
      }
    });
  });
}
