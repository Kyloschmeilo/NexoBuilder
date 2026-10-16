import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  createFolder,
  createItem,
  type ConfigObject,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import { newCraftEngineBlock, newCraftEngineFurniture } from '@resourcepackbuilder/core/craftEngine';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);
const ITEMS = 'resources/loot/configuration/items/dinge/dinge.yml';
const LOOT_SOURCES = 'resources/loot/configuration/loot_sources.yml';

/** A CraftEngine project with one item per edit, in the folder "Dinge". */
function lootProject(...edits: Array<[string, (item: Item) => void]>): Project {
  const project = createProject('Loot', 'loot', '26.3', 'craftengine');
  const folder = createFolder('Dinge', null);
  insertFolder(project, folder);
  for (const [itemId, edit] of edits) {
    const item = createItem({
      displayName: itemId,
      itemId,
      folderId: folder.id,
      material: 'PAPER',
      model: createTextureModel('generated', { layer0: 'thing.png' }, [{ name: 'thing.png', dataUrl: PNG16 }]),
    });
    edit(item);
    insertItem(project, item);
  }
  return project;
}

type Section = Record<string, Record<string, Record<string, unknown>>>;
const parsed = (project: Project, file: string) => parse(pluginText(planExport(project), file)) as Section;
const issues = (project: Project) =>
  planExport(project).issues.map((i) => ({ code: i.code, args: i.args, context: i.context?.map((c) => c.code) }));

/** A loot table as the editor stores it: numbers as text, empty values, keys in any order */
const ORE_TABLE: ConfigObject = {
  pools: [
    {
      entries: [
        {
          type: 'alternatives',
          children: [
            { item: 'loot:ore', type: 'item', conditions: [{ type: 'enchantment', predicate: 'minecraft:silk_touch>=1' }] },
            {
              type: 'item',
              item: 'loot:gem',
              weight: '',
              functions: [
                { type: 'set_count', count: '1~3', add: 'false' },
                { type: 'apply_bonus', enchantment: 'minecraft:fortune', formula: { type: 'ore_drops' } },
                { type: 'explosion_decay' },
              ],
            },
          ],
        },
      ],
      rolls: '1',
      bonus_rolls: '',
    },
  ],
};

const WRITTEN_ORE_TABLE = {
  pools: [
    {
      entries: [
        {
          type: 'alternatives',
          children: [
            { type: 'item', item: 'loot:ore', conditions: [{ type: 'enchantment', predicate: 'minecraft:silk_touch>=1' }] },
            {
              type: 'item',
              item: 'loot:gem',
              functions: [
                { type: 'set_count', count: '1~3', add: false },
                { type: 'apply_bonus', enchantment: 'minecraft:fortune', formula: { type: 'ore_drops' } },
                { type: 'explosion_decay' },
              ],
            },
          ],
        },
      ],
      rolls: 1,
    },
  ],
};

describe('CraftEngine loot tables', () => {
  it('writes a custom block loot table, pruned through the catalogs', () => {
    const project = lootProject(['ore', (item) => (item.config.block = { ...newCraftEngineBlock(), loot: ORE_TABLE })]);
    expect(parsed(project, ITEMS).blocks['loot:ore'].loot).toEqual(WRITTEN_ORE_TABLE);
    expect(issues(project)).toEqual([]);
  });

  it('keeps the block loot template and a loot table id', () => {
    const project = lootProject(
      ['lamp', (item) => (item.config.block = newCraftEngineBlock())],
      ['crate', (item) => (item.config.block = { ...newCraftEngineBlock(), loot: 'minecraft:chests/simple_dungeon' })],
    );
    const blocks = parsed(project, ITEMS).blocks;
    expect(blocks['loot:lamp'].loot).toEqual({ template: 'default:loot_table/self' });
    expect(blocks['loot:crate'].loot).toBe('minecraft:chests/simple_dungeon');
    expect(issues(project)).toEqual([]);
  });

  it('writes a custom furniture loot table', () => {
    const table: ConfigObject = {
      pools: [
        {
          rolls: { type: 'uniform', min: 1, max: '2' },
          entries: [
            { type: 'furniture_item', item: 'loot:chair' },
            { type: 'exp', count: 3 },
          ],
        },
      ],
      functions: [{ type: 'limit_count', max: 2 }],
    };
    const project = lootProject(['chair', (item) => (item.config.furniture = { ...newCraftEngineFurniture(), loot: table })]);
    expect(parsed(project, ITEMS).furniture['loot:chair'].loot).toEqual({
      pools: [
        {
          rolls: { type: 'uniform', min: 1, max: 2 },
          entries: [
            { type: 'furniture_item', item: 'loot:chair' },
            { type: 'exp', count: 3 },
          ],
        },
      ],
      functions: [{ type: 'limit_count', max: 2 }],
    });
    expect(issues(project)).toEqual([]);
  });

  it('reports unknown entry, function and condition types and bad values', () => {
    const table: ConfigObject = {
      pools: [
        {
          rolls: 1,
          conditions: [{ type: 'moon_phase' }],
          entries: [{ type: 'treasure' }, { type: 'item', item: 'loot:x', weight: -1, functions: [{ type: 'enchant_randomly' }] }],
        },
      ],
    };
    const project = lootProject(['box', (item) => (item.config.block = { ...newCraftEngineBlock(), loot: table })]);
    const where = ['context.item', 'context.property'];
    expect(issues(project)).toEqual([
      {
        code: 'plan.fieldTooSmall',
        args: { value: -1, min: 0 },
        context: [...where, 'context.field', 'context.listEntry', 'context.field', 'context.listEntry', 'context.field'],
      },
      { code: 'ce.lootConditionUnknown', args: { type: 'moon_phase' }, context: where },
      { code: 'ce.lootEntryUnknown', args: { type: 'treasure' }, context: where },
      { code: 'ce.lootFunctionUnknown', args: { type: 'enchant_randomly' }, context: where },
    ]);
  });
});

describe('CraftEngine loot sources', () => {
  /** A CraftEngine project with only these loot sources */
  const withSources = (lootSources: Array<Record<string, unknown>>) => {
    const project = createProject('Loot', 'loot', '26.3', 'craftengine');
    project.craftEngine = { lootSources: lootSources as never };
    return project;
  };

  it('writes the loot sources to loot_sources.yml under their ids', () => {
    const project = withSources([
      {
        type: 'entity_death',
        id: 'zombie_bonus',
        target: ['minecraft:zombie'],
        overwrite: '',
        conditions: [{ type: 'random', value: '0.1' }],
        loot: { pools: [{ rolls: 1, entries: [{ type: 'item', item: 'loot:essence' }] }] },
      },
      { id: 'minecraft:fish', type: 'fishing', overwrite: ['items'], loot: 'minecraft:gameplay/fishing/treasure' },
    ]);
    const text = pluginText(planExport(project), LOOT_SOURCES);
    expect(text).toContain('loot_sources:\n  loot:zombie_bonus:\n    type: entity_death\n');
    expect(parse(text)).toEqual({
      loot_sources: {
        'loot:zombie_bonus': {
          type: 'entity_death',
          target: 'minecraft:zombie',
          conditions: [{ type: 'random', value: 0.1 }],
          loot: { pools: [{ rolls: 1, entries: [{ type: 'item', item: 'loot:essence' }] }] },
        },
        'minecraft:fish': { type: 'fishing', overwrite: 'items', loot: 'minecraft:gameplay/fishing/treasure' },
      },
    });
    expect(issues(project)).toEqual([]);
  });

  it('writes no loot_sources.yml without loot sources', () => {
    const plan = planExport(createProject('Loot', 'loot', '26.3', 'craftengine'));
    expect(() => pluginText(plan, LOOT_SOURCES)).toThrow();
  });

  it('reports sources without id, with a taken id, an unknown type, a target where none is allowed or no loot', () => {
    const loot = { template: 'default:loot_table/basic', arguments: { item: 'minecraft:stone' } };
    const project = withSources([
      { type: 'block_break', loot },
      { type: 'block_break', id: 'a', loot },
      { type: 'block_break', id: 'loot:a', loot },
      { type: 'meteor', id: 'b', loot },
      { type: 'piglin_barter', id: 'c', target: 'minecraft:piglin', loot },
      { type: 'vault', id: 'd' },
    ]);
    expect(issues(project)).toEqual([
      { code: 'ce.lootSourceIdMissing', args: undefined, context: ['context.listEntry'] },
      { code: 'ce.lootSourceIdDuplicate', args: { id: 'loot:a' }, context: ['context.lootSource'] },
      { code: 'ce.lootSourceTypeUnknown', args: { type: 'meteor' }, context: ['context.lootSource'] },
      { code: 'ce.lootSourceTargetNotAllowed', args: { type: 'piglin_barter' }, context: ['context.lootSource'] },
      { code: 'ce.lootSourceLootMissing', args: undefined, context: ['context.lootSource'] },
    ]);
    expect(Object.keys(parse(pluginText(planExport(project), LOOT_SOURCES)).loot_sources)).toEqual([
      'loot:a',
      'loot:b',
      'loot:c',
      'loot:d',
    ]);
  });
});
