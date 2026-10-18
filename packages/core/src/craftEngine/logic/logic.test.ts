/**
 * The logic catalogs: unique types, every message key in both catalogues, and typed lists whose entries pass the
 * checks and pruning unchanged (sample entries, unknown types, nested lists).
 */
import { describe, expect, it } from 'vitest';
import { loadCatalogue, type MessageTree } from '@resourcepackbuilder/test-utils/catalogue';
import type { Field, TypedListField } from '../../form/fields';
import { checkFieldValue, fieldToSchema } from '../../form/fieldSchema';
import { cleanConfig } from '../../form/prune';
import type { FormSchema } from '../../form/types';
import { CE_FURNITURE_LOOT_TEMPLATE } from '../furniture';
import { CE_LOGIC, type LogicType, logicMessageKeys, triggersFor } from './index';
import { lootTemplates } from './shared';

function lookup(locale: 'en' | 'de', key: string): unknown {
  let node: unknown = loadCatalogue(locale, 'ceSchema');
  for (const part of key.split('.')) node = typeof node === 'object' && node !== null ? (node as MessageTree)[part] : undefined;
  return node;
}

const listOf = (catalog: keyof typeof CE_LOGIC): TypedListField => ({
  type: 'typedList',
  key: 'list',
  label: 'list',
  catalog,
  types: () => CE_LOGIC[catalog],
  invertible: catalog === 'conditions',
});

/** A valid value of a field, built from its options and limits. */
function sample(field: Field): unknown {
  switch (field.type) {
    case 'text':
      if (field.format === 'vector') return '0.5,0.5,0.5';
      return field.format === 'resource' ? 'minecraft:stone' : field.format === 'duration' ? '5s' : 'text';
    case 'number':
      return field.min ?? 1;
    case 'boolean':
      return true;
    case 'select':
      return field.options[0].value;
    case 'multiSelect':
      return [field.options[0].value];
    case 'stringList':
      if (field.singleAsString) return field.format === 'resource' ? 'minecraft:stone' : 'text';
      return [field.format === 'resource' ? 'minecraft:stone' : 'text'];
    case 'object':
      return sampleObject(field.fields);
    case 'objectList':
      return [sampleObject(field.fields)];
    case 'map':
      return { key: sample(field.value) };
    case 'yaml':
      return { any: ['value'] };
    case 'presence':
      return {};
    case 'texture':
      return '@asset:texture';
    case 'typedList':
      return [{ type: 'has_player' }];
    case 'numberProvider':
      return { type: 'uniform', min: 1, max: '2~3' };
    case 'choice':
      return { template: 'default:loot_table/basic', arguments: { item: 'minecraft:stone' } };
  }
}

const sampleObject = (fields: Field[]) => Object.fromEntries(fields.map((f) => [f.key, sample(f)]));

/** The value after the export's pruning (as the only property of a form). */
function pruned(field: Field, value: unknown): unknown {
  const form = {
    properties: [{ id: 'list', group: 'g', label: '', description: '', field, defaultValue: () => [], storage: 'config', path: ['list'] }],
  } as unknown as FormSchema;
  return cleanConfig(form, { list: value } as never).list;
}

describe('the logic catalogs', () => {
  it('have the types of the plugin registries', () => {
    const counts = Object.fromEntries(Object.entries(CE_LOGIC).map(([name, types]) => [name, types.length]));
    expect(counts).toEqual({
      conditions: 37,
      functions: 55,
      numbers: 13,
      triggers: 12,
      lootSources: 12,
      lootEntries: 8,
      lootFunctions: 6,
      attributeBases: 3,
      attributeSyncValues: 3,
      damageFormulas: 3,
      damageEffects: 3,
      categorySources: 3,
      atlasSources: 5,
      blockBehaviors: 54,
      itemBehaviors: 3,
      furnitureBehaviors: 3,
      itemUpdaters: 3,
    });
  });

  for (const [name, types] of Object.entries(CE_LOGIC)) {
    it(`has unique ${name} types`, () => {
      const names = types.map((t) => t.type);
      expect(names.filter((type, i) => names.indexOf(type) !== i)).toEqual([]);
    });
  }

  it('sorts every block behavior into a catalog category with a name', () => {
    expect(CE_LOGIC.blockBehaviors.filter((t) => !t.category).map((t) => t.type)).toEqual([]);
    expect(new Set(CE_LOGIC.blockBehaviors.map((t) => t.category))).toEqual(
      new Set(['plants', 'building', 'interaction', 'redstone', 'light', 'storage', 'physics', 'placement']),
    );
    const slab = CE_LOGIC.blockBehaviors.find((t) => t.type === 'slab_block');
    expect(slab?.categoryLabel).toBe('logic.categories.blockBehaviors.building');
    // The second name of drop_exp_block keeps its category
    expect(CE_LOGIC.blockBehaviors.find((t) => t.type === 'drop_experience_block')?.category).toBe('physics');
  });

  it('lists the triggers each object kind fires', () => {
    expect(triggersFor('furniture').map((t) => t.type)).toEqual(['right_click', 'left_click', 'place', 'furniture_break']);
    expect(triggersFor('block').map((t) => t.type)).toEqual(['right_click', 'left_click', 'block_break', 'place', 'step']);
  });

  const keys = Object.values(CE_LOGIC).flatMap((types) => logicMessageKeys(types));
  for (const locale of ['en', 'de'] as const) {
    it(`finds every message key in the ${locale} catalogue`, () => {
      expect(keys.filter((k) => typeof lookup(locale, k) !== 'string')).toEqual([]);
    });
  }
});

describe('typedList', () => {
  const typedCatalogs = [
    'conditions',
    'functions',
    'numbers',
    'lootSources',
    'lootEntries',
    'lootFunctions',
    'itemUpdaters',
    'blockBehaviors',
  ] as const;
  for (const catalog of typedCatalogs) {
    it.each(CE_LOGIC[catalog].map((t: LogicType) => [t.type, t]))(`round-trips a sample ${catalog} entry: %s`, (type, t) => {
      const entry = { type, ...sampleObject((t as LogicType).fields) };
      const field = listOf(catalog);
      expect(checkFieldValue([entry], field)).toEqual([]);
      expect(fieldToSchema(field).parse([entry])).toEqual([entry]);
      expect(pruned(field, [entry])).toEqual([entry]);
    });
  }

  it('keeps entries of unknown types unchanged', () => {
    const field = listOf('functions');
    const value = [
      { type: 'some_addon:spell', power: '', nested: { list: [] } },
      { type: 'command', command: 'say hi', as_op: 'true' },
    ];
    expect(checkFieldValue(value, field)).toEqual([]);
    expect(pruned(field, value)).toEqual([value[0], { type: 'command', command: 'say hi', as_op: true }]);
  });

  it('keeps a single entry written without a list', () => {
    const field = listOf('conditions');
    const value = [{ type: 'inverted', term: { type: 'permission', permission: 'a.b' } }];
    expect(checkFieldValue(value, field)).toEqual([]);
    expect(pruned(field, value)).toEqual(value);
    expect(checkFieldValue([{ type: 'inverted', term: { type: 'distance', min: [] } }], field)).toEqual([
      {
        code: 'plan.fieldInvalidValue',
        context: [
          { code: 'context.listEntry', args: { index: 1 } },
          { code: 'context.field', args: { field: { key: 'logic.conditions.inverted.fields.term.label' } } },
          { code: 'context.listEntry', args: { index: 1 } },
          { code: 'context.field', args: { field: { key: 'logic.conditions.distance.fields.min.label' } } },
        ],
      },
    ]);
  });

  it('checks nested lists and inverted conditions by their type', () => {
    const field = listOf('conditions');
    const value = [{ type: 'all_of', terms: [{ type: 'has_player' }, { type: '!equipment_set', set: 'a:b', count: -1 }] }];
    const frame = (label: string) => ({ code: 'context.field', args: { field: { key: label } } });
    expect(checkFieldValue(value, field)).toEqual([
      {
        code: 'plan.fieldTooSmall',
        args: { value: -1, min: 0 },
        context: [
          { code: 'context.listEntry', args: { index: 1 } },
          frame('logic.conditions.allOf.fields.terms.label'),
          { code: 'context.listEntry', args: { index: 2 } },
          frame('logic.conditions.equipmentSet.fields.count.label'),
        ],
      },
    ]);
  });

  it('accepts numbers, range texts and typed objects as number providers', () => {
    const random = CE_LOGIC.conditions.find((t) => t.type === 'random')!;
    const value = random.fields.find((f) => f.key === 'value')!;
    for (const provider of [0.5, '0.1~0.3', '<arg:chance>', { type: 'uniform', min: 0, max: 1 }, { type: 'addon:custom', x: 1 }]) {
      expect(checkFieldValue(provider, value)).toEqual([]);
    }
    expect(checkFieldValue({ type: 'binomial', extra: 3, probability: { type: 'weighted', weights: { '1': -1 } } }, value)).toEqual([
      {
        code: 'plan.fieldTooSmall',
        args: { value: -1, min: 0 },
        context: [
          { code: 'context.field', args: { field: { key: 'logic.numbers.binomial.fields.probability.label' } } },
          { code: 'context.field', args: { field: { key: 'logic.numbers.weighted.fields.weights.label' } } },
          { code: 'context.mapKey', args: { key: '1' } },
        ],
      },
    ]);
  });
});

describe('lootTemplates', () => {
  it("lists the loot table templates of CraftEngine's default pack", () => {
    const templates = lootTemplates();
    expect(templates).toContain(CE_FURNITURE_LOOT_TEMPLATE);
    expect(templates).toContain('default:loot_table/leaves');
    expect(templates.every((id) => id.startsWith('default:loot_table/'))).toBe(true);
  });
});
