import { describe, expect, it } from 'vitest';
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
const BLOCK_FILE = 'resources/bloecke/configuration/items/steine/steine.yml';

/** A flat item model with one layer per texture name. */
const layered = (...names: string[]) =>
  createTextureModel(
    'generated',
    Object.fromEntries(names.map((name, i) => [`layer${i}`, `${name}.png`])),
    names.map((name) => ({ name: `${name}.png`, dataUrl: PNG16 })),
  );

/** A CraftEngine project with one block, set up by `edit`. */
function blockProject(edit: (item: Item) => void): Project {
  const project = createProject('Blöcke', 'bloecke', '1.21.11', 'craftengine');
  const folder = createFolder('Steine', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Block', itemId: 'block_0', folderId: folder.id, material: 'PAPER', model: layered('stone') });
  item.config.block = { state: { auto_state: 'solid' } };
  edit(item);
  insertItem(project, item);
  return project;
}

const blockOf = (project: Project) => {
  const yaml = pluginText(planExport(project), BLOCK_FILE);
  return yaml.slice(yaml.indexOf('blocks:'));
};

describe('CraftEngine block settings', () => {
  it('points the block at its item for the creative pick', () => {
    const plan = planExport(blockProject(() => {}));
    expect(plan.items[0].sections?.blocks?.['bloecke:block_0']?.settings).toEqual({ item: 'bloecke:block_0' });
    expect(blockOf(blockProject(() => {}))).toContain('    settings:\n      item: bloecke:block_0\n');
  });

  it('reports an exact vanilla state left blank as a missing state', () => {
    const codes = (block: ConfigObject) => planExport(blockProject((item) => (item.config.block = block))).issues.map((i) => i.code);
    expect(codes({ state: { state: '  ' } })).toContain('ce.blockStateMissing');
    expect(codes({ state: { state: 'minecraft:stone' } })).not.toContain('ce.blockStateMissing');
    const states = (state: string): ConfigObject => ({
      states: { properties: { lit: { type: 'boolean', default: false } }, appearances: { dim: { state, model: { path: 'a:block/dim' } } } },
    });
    expect(codes(states(' '))).toContain('ce.blockAppearanceStateMissing');
    expect(codes(states('minecraft:stone'))).not.toContain('ce.blockAppearanceStateMissing');
  });

  it('keeps an item the settings name, and the other settings after it', () => {
    const project = blockProject(
      (item) => (item.config.block = { state: { auto_state: 'solid' }, settings: { hardness: 1, item: 'a:b' } }),
    );
    expect(blockOf(project)).toContain('    settings:\n      item: a:b\n      hardness: 1\n');
    const own = blockProject((item) => (item.config.block = { state: { auto_state: 'solid' }, settings: { hardness: 1 } }));
    expect(blockOf(own)).toContain('    settings:\n      item: bloecke:block_0\n      hardness: 1\n');
  });

  it('writes the settings of a variant, the new keys and the detailed sounds', () => {
    const project = blockProject(
      (item) =>
        (item.config.block = {
          states: {
            properties: { waterlogged: { type: 'boolean', default: false } },
            appearances: { dry: { auto_state: 'solid' }, wet: { auto_state: 'solid' } },
            variants: {
              'waterlogged=false': { appearance: 'dry' },
              'waterlogged=true': { appearance: 'wet', settings: { fluid_state: 'water', resistance: 1200 } },
            },
          },
          settings: {
            respect_tool_component: true,
            sounds: { break: { id: 'minecraft:block.stone.break', volume: 0.5, pitch: 0.8 }, step: 'minecraft:block.stone.step' },
            destroy_stages: { items: ['a:stage_0', 'a:stage_1'], billboard: 'fixed' },
          },
        }),
    );
    const yaml = blockOf(project);
    expect(yaml).toContain(
      [
        '        waterlogged=true:',
        '          appearance: wet',
        '          settings:',
        '            fluid_state: water',
        '            resistance: 1200',
      ].join('\n'),
    );
    expect(yaml).toContain(
      [
        '      sounds:',
        '        break:',
        '          id: minecraft:block.stone.break',
        '          volume: 0.5',
        '          pitch: 0.8',
      ].join('\n'),
    );
    expect(yaml).toContain('      respect_tool_component: true\n');
    expect(yaml).toContain(
      '      destroy_stages:\n        items:\n          - a:stage_0\n          - a:stage_1\n        billboard: fixed\n',
    );
  });

  it('writes the fixed internal id first', () => {
    const single = blockProject((item) => (item.config.block = { state: { auto_state: 'solid', id: 5 } }));
    expect(blockOf(single)).toContain('    state:\n      id: 5\n      auto_state: solid\n');
    const multi = blockProject(
      (item) =>
        (item.config.block = {
          states: { properties: { lit: { type: 'boolean', default: false } }, appearances: { a: { auto_state: 'solid' } }, id: 100 },
        }),
    );
    expect(blockOf(multi)).toContain('    states:\n      id: 100\n      properties:\n');
  });
});

describe('CraftEngine block models', () => {
  it('names the model CraftEngine builds from several textures of an appearance', () => {
    const project = blockProject(
      (item) =>
        (item.config.block = {
          states: {
            properties: { lit: { type: 'boolean', default: false } },
            appearances: {
              dim: { auto_state: 'solid', model: { textures: ['a:block/bottom', 'a:block/top', '^a:block/side'], uvlock: true } },
              glowing: { auto_state: 'solid', model: { textures: ['a:block/glow'] } },
            },
            variants: { 'lit=false': { appearance: 'dim' }, 'lit=true': { appearance: 'glowing' } },
          },
        }),
    );
    const yaml = blockOf(project);
    expect(yaml).toContain(
      [
        '        dim:',
        '          auto_state: solid',
        '          model:',
        '            path: bloecke:block/steine/block_0-dim',
        '            uvlock: true',
        '            textures:',
        '              - a:block/bottom',
        '              - a:block/top',
        '              - ^a:block/side',
      ].join('\n'),
    );
    // One texture is its own model
    expect(yaml).toContain(
      ['        glowing:', '          auto_state: solid', '          model:', '            textures:', '              - a:block/glow'].join(
        '\n',
      ),
    );
    expect(yaml).not.toContain('generation');
  });

  it('keeps the path of an appearance named block apart from the generated model', () => {
    const project = blockProject(
      (item) =>
        (item.config.block = {
          states: {
            properties: { lit: { type: 'boolean', default: false } },
            appearances: { base: { auto_state: 'solid' }, block: { auto_state: 'solid', model: { textures: ['a:block/x', 'a:block/y'] } } },
          },
        }),
    );
    const yaml = blockOf(project);
    expect(yaml).toContain('            path: bloecke:block/steine/block_0-look_block\n');
    expect(yaml).toContain('            path: bloecke:block/steine/block_0-block\n');
  });

  it('reports a model built from several textures that has no path to be saved at', () => {
    const look = { auto_state: 'solid', model: { textures: ['a:block/x', 'a:block/y'] } };
    const withoutModel = blockProject((item) => {
      item.model = null;
      item.config.block = { state: look };
    });
    expect(planExport(withoutModel).issues.find((i) => i.code === 'ce.blockModelPathMissing')?.args).toEqual({ look: 'state' });
    const withModel = blockProject((item) => (item.config.block = { state: look }));
    expect(planExport(withModel).issues.map((i) => i.code)).not.toContain('ce.blockModelPathMissing');
  });

  it('keeps a weighted list of models as it is', () => {
    const models: ConfigObject[] = [
      { path: 'a:block/flower_1', weight: 8 },
      { path: 'a:block/flower_2', weight: 5, y: 90 },
    ];
    const project = blockProject((item) => (item.config.block = { state: { auto_state: 'solid', models } }));
    expect(blockOf(project)).toContain(
      [
        '      models:',
        '        - path: a:block/flower_1',
        '          weight: 8',
        '        - path: a:block/flower_2',
        '          weight: 5',
        '          "y": 90',
      ].join('\n'),
    );
  });

  it('builds an orientable block from four textures and a cube from five', () => {
    const orientable = blockProject((item) => (item.model = layered('bottom', 'front', 'side', 'top')));
    expect(blockOf(orientable)).toContain(
      [
        '          parent: minecraft:block/orientable',
        '          textures:',
        '            bottom: bloecke:block/steine/block_0/bottom',
        '            front: bloecke:block/steine/block_0/front',
        '            side: bloecke:block/steine/block_0/side',
        '            top: bloecke:block/steine/block_0/top',
      ].join('\n'),
    );
    // An item has five layers at most: the east face takes the west texture, the particles the north one
    const five = blockProject((item) => (item.model = layered('d', 'u', 'n', 's', 'w')));
    expect(blockOf(five)).toContain(
      [
        '          parent: minecraft:block/cube',
        '          textures:',
        '            down: bloecke:block/steine/block_0/d',
        '            up: bloecke:block/steine/block_0/u',
        '            north: bloecke:block/steine/block_0/n',
        '            south: bloecke:block/steine/block_0/s',
        '            west: bloecke:block/steine/block_0/w',
        '            east: bloecke:block/steine/block_0/w',
        '            particle: bloecke:block/steine/block_0/n',
      ].join('\n'),
    );
    expect(planExport(five).issues.map((i) => i.code)).not.toContain('ce.blockExtraTextures');
  });
});
