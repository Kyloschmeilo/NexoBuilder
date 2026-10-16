/**
 * CraftEngine blocks with several states and the behaviors the editor has a form for. The expected YAML follows the
 * jar's default_assets: tree.yml (palm slab and stairs: `states` from the default templates pack with the vanilla
 * block, textures and model paths as arguments) and ender_pearl_flower.yml (a crop: an int `age`, one appearance
 * per age with a cross model, the support behaviors before crop_block).
 */
import { describe, expect, it } from 'vitest';
import { applyBlockBehavior, newCraftEngineBlock, toMultiState, withFacing } from '@resourcepackbuilder/core/craftEngine';
import {
  type ConfigObject,
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);
const FILE = 'resources/bloecke/configuration/items/steine/steine.yml';

/** A flat item model with one layer per texture name. */
const layered = (...names: string[]) =>
  createTextureModel(
    'generated',
    Object.fromEntries(names.map((name, i) => [`layer${i}`, `${name}.png`])),
    names.map((name) => ({ name: `${name}.png`, dataUrl: PNG16 })),
  );

/** A CraftEngine project with one block item per edit (ids `block_0` …, or the id an edit sets), folder "Steine". */
function blockProject(...edits: Array<(item: Item) => void>): Project {
  const project = createProject('Blöcke', 'bloecke', '1.21.11', 'craftengine');
  const folder = createFolder('Steine', null);
  insertFolder(project, folder);
  edits.forEach((edit, i) => {
    const item = createItem({
      displayName: `Block ${i}`,
      itemId: `block_${i}`,
      folderId: folder.id,
      material: 'PAPER',
      model: layered('planks'),
    });
    item.config.block = newCraftEngineBlock();
    edit(item);
    insertItem(project, item);
  });
  return project;
}

/** Gives the item's block the behavior of a form. */
const behavior = (type: string, id?: string) => (item: Item) => {
  if (id) item.itemId = id;
  item.config.block = applyBlockBehavior(item.config.block as ConfigObject, type, `bloecke:${item.itemId}`, { auto_state: 'solid' });
};

const blocksOf = (project: Project) => {
  const yaml = pluginText(planExport(project), FILE);
  return yaml.slice(yaml.indexOf('blocks:'));
};
const issues = (project: Project) => planExport(project).issues.map((i) => [i.code, i.args]);
const codes = (project: Project) => planExport(project).issues.map((i) => i.code);

describe('CraftEngine block behaviors', () => {
  it('writes a slab like the jar: the slab template with its vanilla block, textures and models', () => {
    expect(blocksOf(blockProject(behavior('slab_block', 'palm_slab')))).toBe(
      [
        'blocks:',
        '  bloecke:palm_slab:',
        '    states:',
        '      template: default:block_state/slab',
        '      arguments:',
        '        slab_base_block: cut_copper_slab',
        '        slab_texture: bloecke:block/steine/palm_slab/planks',
        '        slab_texture_bottom: bloecke:block/steine/palm_slab/planks',
        '        slab_texture_side: bloecke:block/steine/palm_slab/planks',
        '        slab_texture_top: bloecke:block/steine/palm_slab/planks',
        '        slab_model: bloecke:block/steine/palm_slab-slab',
        '        planks_model: bloecke:block/steine/palm_slab-block',
        // The jar's double slab shows the planks block, which exists there; here CraftEngine generates the cube
        '      merges:',
        '        appearances:',
        '          type=double,waterlogged=false:',
        '            model:',
        '              generation:',
        '                parent: minecraft:block/cube_all',
        '                textures:',
        '                  all: bloecke:block/steine/palm_slab/planks',
        '    behavior:',
        '      type: slab_block',
        '    loot:',
        '      template: default:loot_table/slab',
        '',
      ].join('\n'),
    );
  });

  it('writes stairs like the jar: the stairs template with its vanilla block, textures and model', () => {
    expect(blocksOf(blockProject(behavior('stairs_block', 'palm_stairs')))).toBe(
      [
        'blocks:',
        '  bloecke:palm_stairs:',
        '    states:',
        '      template: default:block_state/stairs',
        '      arguments:',
        '        stairs_base_block: exposed_cut_copper_stairs',
        '        stairs_texture: bloecke:block/steine/palm_stairs/planks',
        '        stairs_texture_bottom: bloecke:block/steine/palm_stairs/planks',
        '        stairs_texture_side: bloecke:block/steine/palm_stairs/planks',
        '        stairs_texture_top: bloecke:block/steine/palm_stairs/planks',
        '        stairs_model: bloecke:block/steine/palm_stairs-stairs',
        '    behavior:',
        '      type: stairs_block',
        '    loot:',
        '      template: default:loot_table/self',
        '',
      ].join('\n'),
    );
  });

  it('writes a crop like the jar: an age, one cross appearance per age, the support before crop_block', () => {
    const project = blockProject((item) => {
      item.model = layered('stage');
      behavior('crop_block', 'pearl_flower')(item);
    });
    expect(blocksOf(project)).toBe(
      [
        'blocks:',
        '  bloecke:pearl_flower:',
        '    states:',
        '      properties:',
        '        age:',
        '          type: int',
        '          default: 0',
        '          range: 0~2',
        '      appearances:',
        '        stage_0:',
        '          auto_state: tripwire',
        '          model:',
        '            path: bloecke:block/steine/pearl_flower-block',
        '            generation:',
        '              parent: minecraft:block/cross',
        '              textures:',
        '                cross: bloecke:block/steine/pearl_flower/stage',
        '        stage_1:',
        '          auto_state: tripwire',
        '          model:',
        '            path: bloecke:block/steine/pearl_flower-block',
        '        stage_2:',
        '          auto_state: tripwire',
        '          model:',
        '            path: bloecke:block/steine/pearl_flower-block',
        '      variants:',
        '        age=0:',
        '          appearance: stage_0',
        '        age=1:',
        '          appearance: stage_1',
        '        age=2:',
        '          appearance: stage_2',
        '    behaviors:',
        '      - type: liquid_flowable_block',
        '      - type: bush_block',
        '        bottom_blocks:',
        '          - minecraft:farmland',
        '      - type: crop_block',
        '    loot:',
        '      template: default:loot_table/self',
        '',
      ].join('\n'),
    );
    expect(codes(project)).toEqual([]);
  });

  it('places a door with the two-block item behavior and fills the door template from two textures', () => {
    const project = blockProject((item) => {
      item.model = layered('door_bottom', 'door_top');
      behavior('door_block')(item);
    });
    const plan = planExport(project);
    expect(plan.items[0].config.behavior).toEqual({ type: 'double_high_block_item', block: 'bloecke:block_0' });
    expect(blocksOf(project)).toContain(
      [
        '      arguments:',
        '        door_base_block: spruce_door',
        '        door_model: bloecke:block/steine/block_0-door',
        '        door_texture_bottom: bloecke:block/steine/block_0/door_bottom',
        '        door_texture_top: bloecke:block/steine/block_0/door_top',
      ].join('\n'),
    );
  });

  it('builds the forms of every behavior without errors', () => {
    const types = [
      'trapdoor_block',
      'fence_gate_block',
      'sapling_block',
      'leaves_block',
      'lamp_block',
      'toggleable_lamp_block',
      'seat_block',
      'simple_storage_block',
    ];
    const project = blockProject(...types.map((type) => behavior(type)));
    expect(planExport(project).issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('turns the model of a block that faces the player and generates it once', () => {
    const project = blockProject((item) => {
      const multi = toMultiState(newCraftEngineBlock());
      multi.states = withFacing(multi.states as ConfigObject);
      item.config.block = multi;
    });
    const yaml = blocksOf(project);
    expect(yaml).toContain(
      [
        '        east:',
        '          auto_state: solid',
        '          model:',
        '            path: bloecke:block/steine/block_0-block',
        '            "y": 90',
      ].join('\n'),
    );
    expect(yaml.match(/generation:/g)).toHaveLength(1);
    expect(codes(project)).toEqual([]);
  });
});

describe('the block in the additional YAML', () => {
  it('merges block: into the block, so other behaviors can be written there', () => {
    const project = blockProject(
      (item) => (item.rawYaml = 'block:\n  behavior:\n    type: falling_block\n  settings:\n    hardness: 0.5\n'),
    );
    const plan = planExport(project);
    expect(plan.items[0].config.block).toBeUndefined();
    expect(blocksOf(project)).toContain('    settings:\n      hardness: 0.5\n    behavior:\n      type: falling_block\n');
  });

  it('lets block: replace the model the export would add', () => {
    const project = blockProject((item) => (item.rawYaml = 'block:\n  state:\n    model:\n      path: my:block/own\n'));
    expect(blocksOf(project)).toContain('      model:\n        path: my:block/own\n    loot:');
  });

  it('leaves block: out of an item that is no block, with a warning', () => {
    const project = blockProject((item) => {
      delete item.config.block;
      item.rawYaml = 'block:\n  behavior:\n    type: falling_block\n';
    });
    expect(pluginText(planExport(project), FILE)).not.toContain('falling_block');
    expect(codes(project)).toContain('ce.rawBlockWithoutBlock');
  });
});

describe('checks of blocks with several states', () => {
  const states = (value: ConfigObject) => (item: Item) => (item.config.block = { states: value });

  it('reports incomplete properties, missing appearances and broken variants', () => {
    expect(
      issues(blockProject(states({ properties: { color: { type: 'string' } }, appearances: { a: { auto_state: 'solid' } } }))),
    ).toContainEqual(['ce.blockPropertyInvalid', { property: 'color' }]);
    expect(codes(blockProject(states({ properties: { lit: { type: 'boolean' } } })))).toContain('ce.blockNoAppearance');
    const broken = blockProject(
      states({
        properties: { lit: { type: 'boolean' } },
        appearances: { off: { auto_state: 'solid' }, on: { model: { path: 'a:block/on' } } },
        variants: { 'lit=maybe': { appearance: 'off' }, 'lit=true': { appearance: 'glowing' } },
      }),
    );
    expect(issues(broken)).toEqual(
      expect.arrayContaining([
        ['ce.blockVariantInvalid', { variant: 'lit=maybe' }],
        ['ce.blockVariantAppearanceMissing', { variant: 'lit=true', appearance: 'glowing' }],
        ['ce.blockAppearanceStateMissing', { appearance: 'on' }],
      ]),
    );
  });

  it('reports a behavior whose properties the block lacks', () => {
    const project = blockProject((item) => (item.rawYaml = 'block:\n  behavior:\n    type: lamp_block\n'));
    expect(issues(project)).toContainEqual(['ce.blockBehaviorProperty', { behavior: 'lamp_block', property: 'lit', type: 'boolean' }]);
  });

  it('reports a fence without its items, a template without textures and two blocks on one vanilla block', () => {
    const fence = blockProject((item) => {
      item.config.block = {
        behavior: { type: 'fence_block' },
        states: { template: 'default:block_state/fence', arguments: { fence_post_item: 'a:b' } },
      };
    });
    expect(issues(fence)).toContainEqual(['ce.blockTemplateArgumentMissing', { argument: 'fence_side_item' }]);
    // The form names the items <id>_post and <id>_side: the warning stays until the project has them
    const ownItems = (...ids: string[]) =>
      issues(blockProject(behavior('fence_block'), ...ids.map((id) => (item: Item) => (item.itemId = id))));
    expect(ownItems()).toEqual(
      expect.arrayContaining([
        ['ce.blockFenceItemUnknown', { item: 'bloecke:block_0_post' }],
        ['ce.blockFenceItemUnknown', { item: 'bloecke:block_0_side' }],
      ]),
    );
    expect(ownItems('block_0_post', 'block_0_side').map(([code]) => code)).not.toContain('ce.blockFenceItemUnknown');
    const noTextures = blockProject((item) => {
      item.model = null;
      behavior('stairs_block')(item);
    });
    expect(codes(noTextures)).toContain('ce.blockMissingModel');
    const shared = blockProject(behavior('stairs_block'), behavior('stairs_block'));
    expect(issues(shared)).toContainEqual([
      'ce.blockBaseShared',
      { block: 'exposed_cut_copper_stairs', blocks: 'bloecke:block_0, bloecke:block_1' },
    ]);
  });

  it('counts each appearance against its group’s budget', () => {
    const tripwires = Array.from({ length: 127 }, (_, i) => `t${i}`);
    const project = blockProject(states({ appearances: Object.fromEntries(tripwires.map((name) => [name, { auto_state: 'tripwire' }])) }));
    expect(issues(project)).toContainEqual(['ce.autoStateBudget', { group: 'tripwire', used: 127, capacity: 126 }]);
  });
});
