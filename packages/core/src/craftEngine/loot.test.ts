/** Loot: the loot table field (template, table or id), the Loot tab's properties and the project's loot sources. */
import { describe, expect, it } from 'vitest';
import { findChoice, type ChoiceField } from '../form/fields';
import { checkFieldValue } from '../form/fieldSchema';
import { pruneValue } from '../form/prune';
import { createProject } from '../project/factory';
import { CE_LOOT_PROPERTIES } from './form/schema/loot';
import { craftEngineLootSources, lootPropertyIds, lootSourceKey } from './loot';

const table = CE_LOOT_PROPERTIES[0].field as ChoiceField;

describe('the loot table field', () => {
  it('tells the template, the table and the id apart', () => {
    const form = (value: unknown) => findChoice(table, value)?.id;
    expect(form({ template: 'default:loot_table/self' })).toBe('template');
    expect(form({ pools: [] })).toBe('table');
    expect(form('minecraft:chests/simple_dungeon')).toBe('reference');
    expect(form({})).toBeUndefined();
    expect(form(undefined)).toBeUndefined();
  });

  it('prunes and checks each form by its own fields', () => {
    expect(pruneValue({ template: 'default:loot_table/basic', arguments: { item: 'a:b', count: '' } }, table)).toEqual({
      template: 'default:loot_table/basic',
      arguments: { item: 'a:b' },
    });
    expect(pruneValue({ pools: [{ rolls: '2', bonus_rolls: '', entries: [{ type: 'empty', weight: '3' }] }] }, table)).toEqual({
      pools: [{ rolls: 2, entries: [{ type: 'empty', weight: 3 }] }],
    });
    expect(pruneValue(' ', table)).toBeUndefined();
    // A value of no form is kept as it is
    expect(pruneValue(5, table)).toBe(5);
    expect(checkFieldValue('Not An Id', table)).toEqual([
      { code: 'plan.fieldFormat', args: { value: 'Not An Id', error: { key: 'validation.resource' } }, context: [] },
    ]);
    const frame = (key: string) => ({ code: 'context.field', args: { field: { key } } });
    expect(checkFieldValue({ pools: [{ entries: [{ type: 'item', item: 'a:b', quality: 1.5 }] }] }, table)).toEqual([
      {
        code: 'plan.fieldNotInteger',
        context: [
          frame('logic.shared.lootTable.choices.table.field.fields.pools.label'),
          { code: 'context.listEntry', args: { index: 1 } },
          frame('logic.shared.lootEntries.label'),
          { code: 'context.listEntry', args: { index: 1 } },
          frame('logic.shared.quality.label'),
        ],
      },
    ]);
  });

  it('shows the CraftEngine keys as field titles', () => {
    const tableForm = table.choices.find((choice) => choice.id === 'table')!.field;
    expect(tableForm.type === 'object' && tableForm.fields.map((f) => f.name)).toEqual(['pools', 'functions']);
  });
});

describe('the Loot tab', () => {
  it('shows the loot of the block or of the furniture', () => {
    expect(CE_LOOT_PROPERTIES.map((def) => def.id)).toEqual(['block.loot', 'furniture.loot']);
    expect(lootPropertyIds({ block: {} })).toEqual(['block.loot']);
    expect(lootPropertyIds({ furniture: {} })).toEqual(['furniture.loot']);
    expect(lootPropertyIds({})).toEqual([]);
  });
});

describe('the loot sources', () => {
  it('are written under their id, in the project namespace when they name none', () => {
    const project = createProject('Loot', 'shiny', '26.3', 'craftengine');
    expect(lootSourceKey(project, ' bonus ')).toBe('shiny:bonus');
    expect(lootSourceKey(project, 'minecraft:bonus')).toBe('minecraft:bonus');
    project.craftEngine = {
      lootSources: [
        { type: 'block_break', id: 'bonus', target: ['minecraft:stone'], overwrite: [], loot: { template: 'default:loot_table/self' } },
        { type: 'fishing', id: '', loot: 'a:b' },
        { type: 'fishing', id: 'shiny:bonus', loot: 'a:b' },
        { type: 'some_addon:source', id: 'addon', extra: { keep: true } },
      ],
    };
    expect(craftEngineLootSources(project)).toEqual({
      'shiny:bonus': { type: 'block_break', target: 'minecraft:stone', loot: { template: 'default:loot_table/self' } },
      'shiny:addon': { type: 'some_addon:source', extra: { keep: true } },
    });
  });
});
