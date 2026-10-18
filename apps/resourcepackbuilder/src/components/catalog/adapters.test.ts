/**
 * The catalog adapters on real data: Nexo's components group (added, conflicts, versions, docs, YAML preview) and
 * CraftEngine's block behaviors (human labels, categories with their names, docs tinted for CraftEngine, Premium).
 */
import { describe, expect, it } from 'vitest';
import { CE_LOGIC } from '@resourcepackbuilder/core/craftEngine';
import type { FormSchema, PropertyDef, TypedType } from '@resourcepackbuilder/core/form';
import { formFor } from '@resourcepackbuilder/core/targets';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { catalogFromPropertyGroup, catalogFromTypedSource, type CatalogText, humanizeKey, versionBadges } from './adapters';

/** Looks a dotted key up in a namespace of the English catalogue. */
function lookup(namespace: string, key: string): string | undefined {
  let node: unknown = (MESSAGES_BY_LOCALE.en as Record<string, unknown>)[namespace];
  for (const part of key.split('.')) node = typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[part] : undefined;
  return typeof node === 'string' ? node : undefined;
}

const textFor = (namespace: string): CatalogText => ({
  schema: (key) => lookup(namespace, key) ?? lookup('schema', key) ?? key,
  hasSchema: (key) => lookup(namespace, key) !== undefined || lookup('schema', key) !== undefined,
  conflict: (name) => `Not with ${name}`,
  other: 'Other',
});

describe('catalogFromPropertyGroup', () => {
  const nexo = formFor('nexo');
  const text = textFor(nexo.messages);

  it('maps every property of the group with its translated texts, key, docs and YAML preview', () => {
    const { items, categories } = catalogFromPropertyGroup(nexo, { config: {} }, 'components', { text, version: '1.21.4' });
    const groupSize = nexo.properties.filter((def) => def.group === 'components').length;
    expect(items).toHaveLength(groupSize);
    const food = items.find((item) => item.id === 'Components.food');
    expect(food).toMatchObject({
      label: lookup('schema', 'properties.componentsFood.label'),
      yamlKey: 'Components.food',
      docs: { target: 'nexo', url: expect.stringMatching(/^https:\/\/docs\.nexomc\.com\//) },
    });
    expect(food?.preview).toMatch(/^Components:\n {2}food:\n/);
    expect(food?.added).toBeUndefined();
    // Every Nexo component has a category, named from the catalogue, in the order the form first uses them
    expect(categories.map((category) => category.id)).toEqual(['behavior', 'combat', 'appearance', 'tooltip', 'foodUse', 'equipment']);
    expect(categories.find((category) => category.id === 'foodUse')?.label).toBe(lookup('schema', 'groups.components.categories.foodUse'));
  });

  it('marks the properties the item uses as added', () => {
    const owner = { config: { Components: { max_stack_size: 16 } } };
    const { items } = catalogFromPropertyGroup(nexo, owner, 'components', { text });
    expect(items.filter((item) => item.added).map((item) => item.id)).toEqual(['Components.max_stack_size']);
  });

  it('flags versions outside the project and sorts them as unsupported', () => {
    const { items } = catalogFromPropertyGroup(nexo, { config: {} }, 'components', { text, version: '1.20.4' });
    const tooltip = items.find((item) => item.id === 'Components.tooltip_display');
    expect(tooltip?.badges).toEqual([{ kind: 'from', version: '1.21.5', unsupported: true }]);
    expect(tooltip?.unsupported).toBe(true);
    const current = catalogFromPropertyGroup(nexo, { config: {} }, 'components', { text, version: '1.21.8' });
    expect(current.items.find((item) => item.id === 'Components.tooltip_display')?.unsupported).toBeUndefined();
  });

  it('disables a property that conflicts with one in use, with the reason', () => {
    const conflicting = nexo.properties.find((def) => def.conflicts?.length);
    if (!conflicting?.conflicts) throw new Error('the Nexo form has no conflicting properties');
    const other = nexo.properties.find((def) => def.id === conflicting.conflicts?.[0]) as PropertyDef;
    const config = other.storage === 'config' ? other.path.reduceRight<object>((inner, key) => ({ [key]: inner }), {}) : {};
    const { items } = catalogFromPropertyGroup(nexo, { config: config as never }, conflicting.group, { text });
    expect(items.find((item) => item.id === conflicting.id)?.disabledReason).toBe(`Not with ${text.schema(other.label)}`);
  });

  it('limits the catalog to `only` and names categories, common entries and aliases', () => {
    const schema: FormSchema = {
      ...nexo,
      properties: nexo.properties.map((def) =>
        def.id === 'Components.food'
          ? { ...def, category: 'food', common: true, aliases: ['eat'] }
          : def.id === 'Components.max_damage'
            ? { ...def, category: 'durability_stuff' }
            : // The other entries go under "Other"
              { ...def, category: undefined },
      ),
    };
    const { items, categories } = catalogFromPropertyGroup(schema, { config: {} }, 'components', {
      text: {
        ...text,
        hasSchema: (key) => key === 'groups.components.categories.food',
        schema: (key) => (key.includes('categories.food') ? 'Food & use' : text.schema(key)),
      },
      only: ['Components.food', 'Components.max_damage', 'Components.max_stack_size'],
    });
    expect(items.map((item) => item.id)).toEqual(['Components.max_stack_size', 'Components.max_damage', 'Components.food']);
    expect(items.find((item) => item.id === 'Components.food')).toMatchObject({ category: 'food', common: true, aliases: ['eat'] });
    expect(categories).toEqual([
      { id: 'durability_stuff', label: 'Durability stuff' },
      { id: 'food', label: 'Food & use' },
      { id: 'other', label: 'Other' },
    ]);
  });
});

describe('catalogFromTypedSource', () => {
  const text = textFor('ceSchema');
  const source = { types: () => CE_LOGIC.blockBehaviors };

  it('maps every block behavior with a human label, its id as key, its help and a CraftEngine docs link', () => {
    const { items } = catalogFromTypedSource(source, { text, target: 'craftengine' });
    expect(items).toHaveLength(CE_LOGIC.blockBehaviors.length);
    const slab = items.find((item) => item.id === 'slab_block');
    expect(slab).toMatchObject({
      label: 'Slab block',
      yamlKey: 'slab_block',
      category: 'shapes',
      description: lookup('ceSchema', 'logic.blockBehaviors.slabBlock.help'),
      docs: { target: 'craftengine', url: expect.stringMatching(/^https:\/\/xiao-momi\.github\.io\/craft-engine-wiki\//) },
      preview: 'type: slab_block\n',
    });
    expect(items.find((item) => item.id === 'drop_experience_block')?.aliases).toEqual(['drop_exp_block']);
  });

  it('names the categories from their messages, in catalog order', () => {
    const { categories } = catalogFromTypedSource(source, { text, target: 'craftengine' });
    expect(categories.map((category) => category.id)).toEqual(['shapes', 'redstone', 'blockEntities', 'physics', 'placement', 'plants']);
    expect(categories[0].label).toBe(lookup('ceSchema', 'logic.categories.blockBehaviors.shapes'));
  });

  it('marks the types in the list as added, puts uncategorised types under Other and shows Premium', () => {
    const types: TypedType[] = [
      { type: 'a', label: 'x.a', fields: [], premium: true },
      { type: 'b', label: 'x.b', fields: [], category: 'z' },
    ];
    const { items, categories } = catalogFromTypedSource({ types: () => types }, { text, target: 'craftengine', added: ['b'] });
    expect(items.map((item) => [item.id, item.label, item.added, item.badges])).toEqual([
      ['a', 'x.a', undefined, [{ kind: 'premium' }]],
      ['b', 'x.b', true, undefined],
    ]);
    expect(categories).toEqual([
      { id: 'z', label: 'Z' },
      { id: 'other', label: 'Other' },
    ]);
  });
});

describe('helpers', () => {
  it('turns ids into sentence-case names', () => {
    expect(humanizeKey('slab_block')).toBe('Slab block');
    expect(humanizeKey('minecraft:max_stack_size')).toBe('Max stack size');
    expect(humanizeKey('blockEntities')).toBe('Block entities');
  });

  it('builds version badges', () => {
    expect(versionBadges({ minVersion: '1.21.2', maxVersion: '1.21.4' }, '1.21.5')).toEqual([
      { kind: 'from', version: '1.21.2', unsupported: false },
      { kind: 'until', version: '1.21.4', unsupported: true },
    ]);
    expect(versionBadges({})).toEqual([]);
  });
});
