/** The Nexo item YAML the export builds: the item_model precedence and the order of the root keys. */
import { describe, expect, it } from 'vitest';
import { buildItemConfig, type BuildContext } from './itemConfig';
import { createItem, createProject } from '../project/factory';
import type { Item } from '../project/types';

function setup(config: Item['config'] = {}, rawYaml = '') {
  const project = createProject('T', 't');
  const item = createItem({ displayName: 'Ruby', itemId: 'ruby', folderId: 'f', model: null });
  item.config = { ...item.config, ...config };
  item.rawYaml = rawYaml;
  return { project, item };
}

const components = (context: BuildContext) => buildItemConfig(context).config.Components as Record<string, unknown> | undefined;

describe('Components.item_model precedence', () => {
  it('writes nexo:<id> automatically when the project uses item models', () => {
    const { project, item } = setup();
    expect(components({ project, item, modelKey: 't:item/ruby' })?.item_model).toBe('nexo:ruby');
  });

  it('prefers the generated item model definition over the automatic value', () => {
    const { project, item } = setup();
    expect(components({ project, item, modelKey: 't:item/ruby', itemModel: 't:ruby' })?.item_model).toBe('t:ruby');
  });

  it('prefers the manual field over the automatic value', () => {
    const { project, item } = setup({ Components: { item_model: 'nexo:empty' } });
    expect(components({ project, item, modelKey: 't:item/ruby' })?.item_model).toBe('nexo:empty');
  });

  it('prefers the manual field over a generated item model definition', () => {
    const { project, item } = setup({ Components: { item_model: 'nexo:empty' } });
    expect(components({ project, item, modelKey: 't:item/ruby', itemModel: 't:ruby' })?.item_model).toBe('nexo:empty');
  });

  it('writes the manual field for an item without a model', () => {
    const { project, item } = setup({ Components: { item_model: 'nexo:empty' } });
    expect(components({ project, item, modelKey: null })?.item_model).toBe('nexo:empty');
  });

  it('lets the additional YAML override the manual field', () => {
    const { project, item } = setup({ Components: { item_model: 'nexo:empty' } }, 'Components:\n  item_model: minecraft:stick\n');
    expect(components({ project, item, modelKey: 't:item/ruby', itemModel: 't:ruby' })?.item_model).toBe('minecraft:stick');
  });

  it('ignores a blank manual field', () => {
    const { project, item } = setup({ Components: { item_model: '  ' } });
    expect(components({ project, item, modelKey: 't:item/ruby', itemModel: 't:ruby' })?.item_model).toBe('t:ruby');
  });
});

describe('root key order', () => {
  it('writes the item root keys in the order of the Nexo docs', () => {
    const { project, item } = setup({
      Mechanics: { soulbound: { lose_chance: 0.5 } },
      PotionEffects: [{ type: 'speed', duration: '10s' }],
      no_auto_update: true,
      StoredEnchantments: { mending: 1 },
      trim_material: 'minecraft:gold',
      injectId: false,
      trim_pattern: 'minecraft:coast',
      customname: '<red>Ruby',
      template: ['base'],
      lore: ['a'],
    });
    expect(Object.keys(buildItemConfig({ project, item, modelKey: null }).config)).toEqual([
      'itemname',
      'material',
      'customname',
      'template',
      'lore',
      'trim_pattern',
      'trim_material',
      'injectId',
      'no_auto_update',
      'StoredEnchantments',
      'PotionEffects',
      'Mechanics',
    ]);
  });
});

describe('structured components', () => {
  it('writes the keys Nexo 1.30 reads, single values without a list', () => {
    const { project, item } = setup({
      Components: {
        custom_model_data: { float: ['1.5'], flag: ['true', 'false'], color: [''] },
        can_place_on: { block: ['stone'], nexo_block: ['ruby_ore'], state: { axis: 'y' } },
        blocks_attacks: { block_delay: '0.25s', damage_reductions: [{ types: ['minecraft:is_projectile'], base: 0, factor: 1 }] },
        kinetic_weapon: { delay: '0t', dismount_conditions: { max_duration: '10s', min_speed: 0.5 } },
      },
    });
    expect(components({ project, item, modelKey: null })).toMatchObject({
      custom_model_data: { float: '1.5', flag: ['true', 'false'] },
      can_place_on: { block: 'stone', nexo_block: 'ruby_ore', state: { axis: 'y' } },
      blocks_attacks: { block_delay: '0.25s', damage_reductions: [{ types: 'minecraft:is_projectile', base: 0, factor: 1 }] },
      kinetic_weapon: { delay: '0t', dismount_conditions: { max_duration: '10s', min_speed: 0.5 } },
    });
  });
});
