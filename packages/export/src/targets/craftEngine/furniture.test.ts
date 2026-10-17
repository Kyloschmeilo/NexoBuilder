import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  createFolder,
  createItem,
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
const FILE = 'resources/moebel/configuration/items/stuehle/stuehle.yml';
const SOUNDS = {
  break: 'minecraft:block.bamboo_wood.break',
  place: 'minecraft:block.bamboo_wood.place',
  hit: 'minecraft:block.bamboo_wood.hit',
};

/** A CraftEngine project with one item per edit, in the folder "Stühle". */
function furnitureProject(...edits: Array<[string, (item: Item) => void]>): Project {
  const project = createProject('Möbel', 'moebel', '26.3', 'craftengine');
  const folder = createFolder('Stühle', null);
  insertFolder(project, folder);
  for (const [itemId, edit] of edits) {
    const item = createItem({
      displayName: itemId,
      itemId,
      folderId: folder.id,
      material: 'PAPER',
      model: createTextureModel('generated', { layer0: 'wood.png' }, [{ name: 'wood.png', dataUrl: PNG16 }]),
    });
    item.config.furniture = newCraftEngineFurniture();
    edit(item);
    insertItem(project, item);
  }
  return project;
}

const fileOf = (project: Project) =>
  parse(pluginText(planExport(project), FILE)) as Record<string, Record<string, Record<string, unknown>>>;
const codes = (project: Project) => planExport(project).issues.map((i) => [i.code, i.args]);

/** The jar's default:bench (configuration/furniture/bench.yml), as the editor stores it. */
const bench = (item: Item) => {
  item.config.furniture = {
    rules: { ground: { rotation: 'four', alignment: 'center' } },
    events: [{ template: 'default:rotatable_furniture_4' }],
    settings: { hit_times: 3, sounds: SOUNDS },
    variants: {
      ground: {
        loot_spawn_offset: '0.5,0.5,0',
        elements: [
          {
            type: 'item_display',
            display_transform: 'none',
            billboard: 'fixed',
            position: '0.5,0,0',
            translation: '0,0.5,0',
            shadow_radius: 1,
            shadow_strength: 0.2,
          },
        ],
        hitboxes: [
          {
            position: '0,0,0',
            type: 'shulker',
            direction: 'east',
            peek: 100,
            blocks_building: true,
            interactive: true,
            interaction_entity: true,
            seats: ['0,0,-0.1 0 true', '1,0,-0.1 0 true'],
          },
        ],
      },
    },
    loot: { template: 'default:loot_table/furniture' },
  };
};

/** The jar's default:wooden_chair (configuration/furniture/wooden_chair.yml), as the editor stores it. */
const woodenChair = (item: Item) => {
  item.config.furniture = {
    rules: { ground: { rotation: 'any', alignment: 'any' } },
    events: [{ template: 'default:rotatable_furniture_8' }],
    settings: { hit_times: 3, sounds: SOUNDS },
    variants: {
      ground: {
        loot_spawn_offset: '0,0.4,0',
        elements: [
          {
            type: 'item_display',
            display_transform: 'none',
            shadow_radius: 0.4,
            shadow_strength: 0.5,
            billboard: 'fixed',
            translation: '0,0.5,0',
          },
        ],
        hitboxes: [
          {
            position: '0,0,0',
            type: 'interaction',
            blocks_building: true,
            invisible: true,
            width: 0.7,
            height: 1.2,
            interactive: true,
            seats: ['0,0,-0.1 0 true'],
          },
        ],
      },
    },
    loot: { template: 'default:loot_table/furniture' },
  };
};

describe('CraftEngine furniture', () => {
  it('writes the bench as the jar does, with the furniture under furniture:', () => {
    const file = fileOf(furnitureProject(['bench', bench]));
    expect(file.items['moebel:bench'].behavior).toEqual({
      type: 'furniture_item',
      furniture: 'moebel:bench',
      rules: { ground: { rotation: 'four', alignment: 'center' } },
    });
    expect(file.furniture['moebel:bench']).toEqual({
      settings: { item: 'moebel:bench', hit_times: 3, sounds: SOUNDS },
      variants: {
        ground: {
          loot_spawn_offset: '0.5,0.5,0',
          elements: [
            {
              type: 'item_display',
              item: 'moebel:bench',
              display_transform: 'none',
              billboard: 'fixed',
              position: '0.5,0,0',
              translation: '0,0.5,0',
              shadow_radius: 1,
              shadow_strength: 0.2,
            },
          ],
          hitboxes: [
            {
              type: 'shulker',
              position: '0,0,0',
              peek: 100,
              direction: 'east',
              blocks_building: true,
              interactive: true,
              interaction_entity: true,
              seats: ['0,0,-0.1 0 true', '1,0,-0.1 0 true'],
            },
          ],
        },
      },
      events: [{ template: 'default:rotatable_furniture_4' }],
      loot: { template: 'default:loot_table/furniture', arguments: { item: 'moebel:bench' } },
    });
  });

  it('writes the wooden chair with its interaction hitbox and seat', () => {
    const project = furnitureProject(['wooden_chair', woodenChair]);
    const yaml = pluginText(planExport(project), FILE);
    expect(yaml).toContain(
      ['furniture:', '  moebel:wooden_chair:', '    settings:', '      item: moebel:wooden_chair', '      hit_times: 3'].join('\n'),
    );
    expect(yaml).toContain(
      [
        '        hitboxes:',
        '          - type: interaction',
        '            position: 0,0,0',
        '            width: 0.7',
        '            height: 1.2',
        '            blocks_building: true',
        '            invisible: true',
        '            interactive: true',
        '            seats:',
        '              - 0,0,-0.1 0 true',
      ].join('\n'),
    );
    expect(fileOf(project).items['moebel:wooden_chair'].behavior).toEqual({
      type: 'furniture_item',
      furniture: 'moebel:wooden_chair',
      rules: { ground: { rotation: 'any', alignment: 'any' } },
    });
    expect(codes(project)).toEqual([]);
  });

  it('writes a new furniture without problems', () => {
    const project = furnitureProject(['stool', () => {}]);
    expect(fileOf(project).furniture['moebel:stool']).toEqual({
      settings: { item: 'moebel:stool' },
      variants: {
        ground: {
          elements: [{ type: 'item_display', item: 'moebel:stool', position: '0,0.5,0' }],
          hitboxes: [{ type: 'interaction', position: '0,0,0', width: 1, height: 1 }],
        },
      },
      loot: { template: 'default:loot_table/furniture', arguments: { item: 'moebel:stool' } },
    });
    expect(codes(project)).toEqual([]);
  });

  it('lets elements show other items of the pack', () => {
    const project = furnitureProject(
      [
        'globe',
        (item) =>
          ((item.config.furniture as never as { variants: { ground: { elements: unknown[] } } }).variants.ground.elements = [
            { type: 'item', item: 'moebel:globe_earth', position: '0,0.4,0' },
            { item: 'moebel:globe_base', position: '0,0.5,0' },
            { item: 'moebel:missing' },
          ]),
      ],
      ['globe_earth', (item) => delete item.config.furniture],
      ['globe_base', (item) => delete item.config.furniture],
    );
    const elements = (fileOf(project).furniture['moebel:globe'] as { variants: { ground: { elements: unknown[] } } }).variants.ground
      .elements;
    expect(elements).toEqual([
      { type: 'item', item: 'moebel:globe_earth', position: '0,0.4,0' },
      { type: 'item_display', item: 'moebel:globe_base', position: '0,0.5,0' },
      { type: 'item_display', item: 'moebel:missing' },
    ]);
    expect(codes(project)).toEqual([['ce.furnitureItemUnknown', { variant: 'ground', item: 'moebel:missing' }]]);
  });
});

describe('the furniture in the additional YAML', () => {
  it('merges furniture: into the furniture, so behaviors can be written there', () => {
    const project = furnitureProject([
      'showcase',
      (item) => (item.rawYaml = 'furniture:\n  behaviors:\n    - type: display_item_furniture\n  settings:\n    hit_times: 5\n'),
    ]);
    const file = fileOf(project);
    expect(file.items['moebel:showcase'].furniture).toBeUndefined();
    expect(file.furniture['moebel:showcase'].behaviors).toEqual([{ type: 'display_item_furniture' }]);
    expect(file.furniture['moebel:showcase'].settings).toEqual({ item: 'moebel:showcase', hit_times: 5 });
  });

  it('leaves furniture: out of an item that is no furniture, with a warning', () => {
    const project = furnitureProject([
      'plain',
      (item) => {
        delete item.config.furniture;
        item.rawYaml = 'furniture:\n  settings:\n    hit_times: 5\n';
      },
    ]);
    expect(pluginText(planExport(project), FILE)).not.toContain('hit_times');
    expect(codes(project).map(([code]) => code)).toContain('ce.rawFurnitureWithoutFurniture');
  });
});

describe('the furniture item in the additional YAML', () => {
  it('keeps placement rules written in the raw behavior:', () => {
    const project = furnitureProject(['lamp', (item) => (item.rawYaml = 'behavior:\n  rules:\n    ground:\n      rotation: eight\n')]);
    expect(fileOf(project).items['moebel:lamp'].behavior).toEqual({
      type: 'furniture_item',
      furniture: 'moebel:lamp',
      rules: { ground: { rotation: 'eight', alignment: 'center' } },
    });
    expect(codes(project)).toEqual([]);
  });

  it('moves placement rules written in the raw furniture: to the item', () => {
    const project = furnitureProject(['lamp', (item) => (item.rawYaml = 'furniture:\n  rules:\n    wall:\n      alignment: half\n')]);
    const file = fileOf(project);
    expect((file.items['moebel:lamp'].behavior as Record<string, unknown>).rules).toEqual({
      ground: { rotation: 'four', alignment: 'center' },
      wall: { alignment: 'half' },
    });
    expect(file.furniture['moebel:lamp'].rules).toBeUndefined();
  });

  it('keeps an item and loot arguments the definition sets', () => {
    const project = furnitureProject(
      [
        'lamp',
        (item) => {
          const furniture = item.config.furniture as Record<string, unknown>;
          furniture.settings = { item: 'moebel:lamp_off' };
          furniture.loot = { template: 'default:loot_table/furniture', arguments: { item: 'moebel:lamp_off' } };
        },
      ],
      ['lamp_off', (item) => delete item.config.furniture],
    );
    const furniture = fileOf(project).furniture['moebel:lamp'];
    expect(furniture.settings).toEqual({ item: 'moebel:lamp_off' });
    expect(furniture.loot).toEqual({ template: 'default:loot_table/furniture', arguments: { item: 'moebel:lamp_off' } });
  });
});

describe('furniture checks', () => {
  it('builds the block of an item that is a block and furniture at once, with an error', () => {
    const project = furnitureProject(['both', (item) => (item.config.block = newCraftEngineBlock())]);
    const file = fileOf(project);
    expect(file.furniture).toBeUndefined();
    expect(file.items['moebel:both'].behavior).toEqual({ type: 'block_item', block: 'moebel:both' });
    expect(codes(project).map(([code]) => code)).toContain('ce.furnitureWithBlock');
  });

  it('reports what CraftEngine cannot read', () => {
    const project = furnitureProject([
      'broken',
      (item) => {
        item.config.furniture = {
          rules: { ground: { rotation: 'five' } },
          variants: {
            lit: {
              elements: [{ type: 'hologram' }, { type: 'block_display' }, { type: 'item_display', position: 'up', rotation: '1,2,3,4,5' }],
              hitboxes: [{ type: 'slime' }, { type: 'custom', seats: ['a,b'] }],
            },
            dark: { loot_spawn_offset: '0,0,0' },
          },
        };
      },
    ]);
    expect(codes(project)).toEqual([
      ['ce.furnitureNoPlaceableVariant', undefined],
      ['ce.furnitureElementTypeInvalid', { variant: 'lit', type: 'hologram' }],
      ['ce.furnitureElementKeyMissing', { variant: 'lit', type: 'block_display', key: 'block' }],
      ['ce.furnitureValueInvalid', { variant: 'lit', key: 'position', value: 'up' }],
      ['ce.furnitureValueInvalid', { variant: 'lit', key: 'rotation', value: '1,2,3,4,5' }],
      ['ce.furnitureHitboxTypeInvalid', { variant: 'lit', type: 'slime' }],
      ['ce.furnitureHitboxEntityMissing', { variant: 'lit' }],
      ['ce.furnitureValueInvalid', { variant: 'lit', key: 'seats', value: 'a,b' }],
      ['ce.furnitureVariantEmpty', { variant: 'dark' }],
      ['ce.furnitureRuleInvalid', { variant: 'ground', key: 'rotation', value: 'five' }],
    ]);
  });

  it('takes a variant with an external model under any of its keys as not empty', () => {
    const variant = (key: string): [string, (item: Item) => void] => [
      `m_${key}`,
      (item) => (item.config.furniture = { variants: { ground: { [key]: 'chair' } } }),
    ];
    const project = furnitureProject(variant('blueprint'), variant('better_model'), variant('model_engine'));
    expect(codes(project).map(([code]) => code)).not.toContain('ce.furnitureVariantEmpty');
  });

  it('needs a variant', () => {
    const project = furnitureProject(['empty', (item) => (item.config.furniture = { settings: { hit_times: 2 } })]);
    expect(codes(project)).toEqual([['ce.furnitureNoVariant', undefined]]);
  });
});
