/** The furniture and renderer editor fields: docs links, the types each field shows for, and behavior round trips. */
import { describe, expect, it } from 'vitest';
import { fieldToSchema, checkFieldValue } from '../form/fieldSchema';
import { type Field, findTypedType } from '../form/fields';
import { pruneValue } from '../form/prune';
import { CE_WIKI_URL } from './form/schema/docs';
import {
  CE_FURNITURE_BEHAVIOR_LIST,
  CE_FURNITURE_EDITOR_FIELDS,
  CE_FURNITURE_ELEMENT_FIELDS,
  CE_HITBOX_FLAG_FIELDS,
  CE_RENDERER_ELEMENT_FIELDS,
} from './furnitureFields';
import { CE_FURNITURE_BEHAVIORS } from './logic';

const keysFor = (fields: Field[], type: string) => fields.filter((f) => !f.showIf || f.showIf.values.includes(type)).map((f) => `${f.key}`);

describe('furniture editor fields', () => {
  it('link every field and behavior to its section of the wiki', () => {
    const links = [
      ...CE_FURNITURE_EDITOR_FIELDS.map((f): [string, string | undefined] => [f.key, f.docs]),
      ...CE_FURNITURE_BEHAVIORS.map((t): [string, string | undefined] => [t.type, t.docs]),
    ];
    expect(links.filter(([, link]) => !link?.startsWith(CE_WIKI_URL))).toEqual([]);
    expect(CE_FURNITURE_BEHAVIORS.find((t) => t.type === 'glowing_furniture')?.docs).toBe(
      'https://xiao-momi.github.io/craft-engine-wiki/configuration/furniture/behaviors/glowing_furniture',
    );
  });

  it('show each element the keys its type reads', () => {
    expect(keysFor(CE_FURNITURE_ELEMENT_FIELDS, 'text_display')).toEqual([
      'yaw',
      'pitch',
      'glow_color',
      'brightness',
      'view_range',
      'shadow_radius',
      'shadow_strength',
      'line_width',
      'background_color',
      'text_opacity',
      'has_shadow',
      'is_see_through',
      'use_default_background_color',
      'alignment',
      'conditions',
    ]);
    expect(keysFor(CE_FURNITURE_ELEMENT_FIELDS, 'armor_stand')).toEqual([
      'scale',
      'glow_color',
      'yaw',
      'pitch',
      'small',
      'copy_data',
      'conditions',
    ]);
    expect(keysFor(CE_FURNITURE_ELEMENT_FIELDS, 'item')).toEqual(['copy_data', 'conditions']);
    expect(keysFor(CE_FURNITURE_ELEMENT_FIELDS, 'better_model')).toEqual(['yaw', 'pitch', 'sight_trace', 'tints', 'conditions']);
    // Renderer elements tint from the block and can be offset at random; they copy no data from an item
    expect(keysFor(CE_RENDERER_ELEMENT_FIELDS, 'item')).toEqual(['tint_source', 'offset', 'conditions']);
  });

  it('show each hitbox the flags its type reads', () => {
    expect(keysFor(CE_HITBOX_FLAG_FIELDS, 'interaction')).toEqual(['can_use_item_on', 'can_be_hit_by_projectile', 'invisible']);
    expect(keysFor(CE_HITBOX_FLAG_FIELDS, 'shulker')).toEqual([
      'can_use_item_on',
      'can_be_hit_by_projectile',
      'invisible',
      'interaction_entity',
    ]);
    expect(keysFor(CE_HITBOX_FLAG_FIELDS, 'happy_ghast')).toEqual(['can_use_item_on', 'can_be_hit_by_projectile', 'hard_collision']);
  });
});

describe('furniture behaviors', () => {
  const samples = [
    {
      type: 'simple_storage_furniture',
      title: '<dark_gray>Left drawer',
      rows: 2,
      data_key: 'left_drawer',
      sounds: { open: 'minecraft:block.barrel.open', close: { id: 'minecraft:block.barrel.close', volume: 0.5, pitch: 1 } },
      variants: { ground: { hitboxes: [{ type: 'interaction', position: '-0.25,0.5,0', width: 0.5, height: 1, interactive: true }] } },
    },
    {
      type: 'display_item_furniture',
      data_key: 'slot_1',
      sounds: { put: 'minecraft:entity.item_frame.add_item' },
      variants: { ground: { item_position: '0,1,0', hitboxes: [{ type: 'interaction', width: 0.5, height: 0.5 }] } },
    },
    { type: 'glowing_furniture', lights: [{ position: '0,0.5,0', level: 15 }], variants: { wall: [{ position: '0,0,0.2', level: 12 }] } },
  ];

  it.each(samples.map((s) => [s.type, s]))('round-trips a %s entry', (_type, entry) => {
    expect(findTypedType(CE_FURNITURE_BEHAVIOR_LIST, entry)).toBeDefined();
    expect(checkFieldValue([entry], CE_FURNITURE_BEHAVIOR_LIST)).toEqual([]);
    expect(fieldToSchema(CE_FURNITURE_BEHAVIOR_LIST).parse([entry])).toEqual([entry]);
    expect(pruneValue([entry], CE_FURNITURE_BEHAVIOR_LIST)).toEqual([entry]);
  });
});
