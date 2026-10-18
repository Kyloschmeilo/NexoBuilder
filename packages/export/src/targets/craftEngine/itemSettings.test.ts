/** The structured item settings of a CraftEngine item as the export writes and checks them. */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  type ConfigObject,
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Project,
} from '@resourcepackbuilder/core/project';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const FILE = 'resources/werk/configuration/items/teile/teile.yml';

/** A CraftEngine project with one item (`werk:part`) whose settings are `settings` */
function project(settings: ConfigObject): Project {
  const result = createProject('Werk', 'werk', '1.21.11', 'craftengine');
  const folder = createFolder('Teile', null);
  insertFolder(result, folder);
  const item = createItem({ displayName: 'part', itemId: 'part', folderId: folder.id, material: 'PAPER', model: null });
  item.config.settings = settings;
  insertItem(result, item);
  return result;
}

const settingsOf = (p: Project) =>
  (parse(pluginText(planExport(p), FILE)) as { items: Record<string, Record<string, unknown>> }).items['werk:part'].settings;
const codes = (p: Project) =>
  planExport(p)
    .issues.filter((issue) => issue.code !== 'ce.missingModel')
    .map((issue) => [issue.code, issue.args]);

describe('structured CraftEngine item settings', () => {
  const settings = {
    repairable: { crafting_table: true, anvil_repair: false },
    drop_display: '<arg:count>x <name>',
    food: { nutrition: 5, saturation: 3.5 },
    equipment_lod: { asset_id: 'werk:armor_2d', distance: 32 },
    equipment_potion_effects: [
      { slot: 'head', type: 'minecraft:strength', amplifier: 2, particles: false, conditions: [{ type: 'is_bedrock_player' }] },
    ],
    projectile: {
      display: { item: 'werk:spear', display_transform: 'none', scale: '0.5' },
      sounds: {
        throw: { id: 'minecraft:item.trident.throw', pitch: '0.9~1' },
        hit_block: { default: 'minecraft:item.trident.hit', overrides: { 'minecraft:stone': 'minecraft:item.trident.hit_ground' } },
      },
      pickupable: true,
      velocity: 1.5,
      pierce_level: 2,
    },
    drag_repair_item: [{ target: '#minecraft:pickaxes', amount: 10, sound: { id: 'minecraft:item.armor.equip_iron', volume: 1 } }],
    anvil_repair_material: [{ material: 'minecraft:diamond', amount: 100 }],
    disable_vanilla_behavior: true,
    trigger_advancement: false,
  };

  it('writes them as they are set and finds nothing to report', () => {
    const p = project(settings);
    expect(settingsOf(p)).toEqual(settings);
    expect(codes(p)).toEqual([]);
  });

  it('writes a craft remainder per recipe with each type first', () => {
    const p = project({
      craft_remainder: {
        terms: [
          { recipes: ['werk:a'], craft_remainder: { damage: 2, type: 'hurt_and_break' } },
          { recipes: ['werk:b'], craft_remainder: 'minecraft:stone' },
        ],
        fallback: { item: 'minecraft:bucket', count: 1, type: 'fixed' },
        type: 'recipe_based',
      },
    });
    expect(pluginText(planExport(p), FILE)).toContain(
      [
        '      craft_remainder:',
        '        type: recipe_based',
        '        terms:',
        '          - recipes:',
        '              - werk:a',
        '            craft_remainder:',
        '              type: hurt_and_break',
        '              damage: 2',
        '          - recipes:',
        '              - werk:b',
        '            craft_remainder: minecraft:stone',
        '        fallback:',
        '          type: fixed',
        '          item: minecraft:bucket',
        '          count: 1',
      ].join('\n'),
    );
    expect(codes(p)).toEqual([]);
  });

  it('reports a food value out of range', () => {
    const p = project({ food: { nutrition: 25, saturation: 3 } });
    expect(codes(p).map(([code]) => code)).toContain('plan.fieldTooLarge');
  });
});
