/**
 * The item data fields that take several forms: each form a saved value can have is recognized, checked and kept,
 * so items saved before the forms existed (plain lore lines, a profile text, enchantment levels, client-bound YAML)
 * export as before.
 */
import { describe, expect, it } from 'vitest';
import { findChoice, type ChoiceField, type Field } from '../../../form/fields';
import { checkFieldValue } from '../../../form/fieldSchema';
import { pruneValue } from '../../../form/prune';
import { CRAFT_ENGINE_FORM } from '../schema';

const fieldOf = (id: string): Field => CRAFT_ENGINE_FORM.properties.find((p) => p.id === id)!.field;
const formOf = (id: string, value: unknown) => findChoice(fieldOf(id) as ChoiceField, value)?.id;

describe('CraftEngine item data forms', () => {
  it('reads lore as lines or as entries and keeps a list that mixes both', () => {
    expect(formOf('data.lore', ['A', 'B'])).toBe('lines');
    expect(formOf('data.lore', 'A')).toBe('lines');
    expect(formOf('data.lore', [{ content: 'A', priority: 1 }])).toBe('entries');
    const mixed = ['A', { content: 'B' }];
    expect(formOf('data.lore', mixed)).toBeUndefined();
    expect(pruneValue(mixed, fieldOf('data.lore'))).toEqual(mixed);
    expect(checkFieldValue(mixed, fieldOf('data.lore'))).toEqual([]);
  });

  it('checks the entries of advanced lore by their fields', () => {
    const issues = checkFieldValue([{ content: 'A', operation: 'INSERT' }], fieldOf('data.lore'));
    expect(issues.map((issue) => issue.code)).toEqual(['plan.fieldNotAnOption']);
  });

  it('reads a profile as a text or a map and enchantments as levels or the merge form', () => {
    expect(formOf('data.profile', 'XiaoMoMi')).toBe('text');
    expect(formOf('data.profile', { name: 'XiaoMoMi' })).toBe('map');
    expect(formOf('data.enchantment', { 'minecraft:sharpness': 3 })).toBe('levels');
    expect(formOf('data.enchantment', { merge: true, enchantments: { 'minecraft:sharpness': 3 } })).toBe('merge');
    expect(formOf('data.block_state', 'default:palm_sapling[stage=0]')).toBe('block');
    expect(formOf('data.block_state', { note: '1' })).toBe('properties');
  });

  it('keeps client-bound data written as YAML before it had fields', () => {
    const value = {
      lore: ['A'],
      item_name: 'Name',
      'conditional#1': { conditions: [{ type: 'permission', permission: 'a' }], data: { lore: ['B'] } },
    };
    expect(checkFieldValue(value, fieldOf('client_bound_data'))).toEqual([]);
    expect(pruneValue(value, fieldOf('client_bound_data'))).toEqual(value);
  });

  it('keeps the version keys of the updater and checks each updater by its type', () => {
    const value = {
      '1': { type: 'transmute', material: 'minecraft:stone_sword' },
      '3': [{ type: 'reset', keep_components: ['minecraft:enchantments'] }],
    };
    expect(checkFieldValue(value, fieldOf('updater'))).toEqual([]);
    expect(pruneValue(value, fieldOf('updater'))).toEqual(value);
  });
});
