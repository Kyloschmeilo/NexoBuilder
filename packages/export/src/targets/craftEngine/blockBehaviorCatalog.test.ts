/**
 * CraftEngine block behaviors edited through the behavior catalog: their keys written as the wiki shows them, the
 * presets of further behaviors (buttons, stackable blocks …), and the checks of keys a behavior cannot do without.
 */
import { describe, expect, it } from 'vitest';
import { applyBlockBehavior, newCraftEngineBlock } from '@resourcepackbuilder/core/craftEngine';
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

/** A CraftEngine project with one block item per edit (ids `block_0` …), folder "Steine". */
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
      model: createTextureModel('generated', { layer0: 'planks.png' }, [{ name: 'planks.png', dataUrl: PNG16 }]),
    });
    item.config.block = newCraftEngineBlock();
    edit(item);
    insertItem(project, item);
  });
  return project;
}

const preset = (type: string) => (item: Item) => {
  item.config.block = applyBlockBehavior(item.config.block as ConfigObject, type, `bloecke:${item.itemId}`, { auto_state: 'solid' });
};
const blocksOf = (project: Project) => {
  const yaml = pluginText(planExport(project), FILE);
  return yaml.slice(yaml.indexOf('blocks:'));
};
const issues = (project: Project) => planExport(project).issues.map((i) => [i.code, i.args]);

describe('CraftEngine block behaviors from the catalog', () => {
  it('writes further behaviors with their keys before the main behavior', () => {
    const project = blockProject((item) => {
      preset('drawer_block')(item);
      const block = item.config.block as ConfigObject;
      block.behavior = {
        ...(block.behavior as ConfigObject),
        max_stacks: 20,
        sounds: { put: { id: 'minecraft:block.decorated_pot.insert', pitch: '0.9~1' } },
      };
      block.behaviors = [
        { type: 'simple_particle_block', particles: [{ particle: 'minecraft:dust', color: '255,0,0', scale: 1.5, x: 0.5 }] },
        { type: 'bouncing_block', fall_damage_multiplier: 0 },
      ];
    });
    const yaml = blocksOf(project);
    expect(yaml).toContain(
      [
        '    behaviors:',
        '      - type: simple_particle_block',
        '        particles:',
        '          - particle: minecraft:dust',
        '            x: 0.5',
        '            color: 255,0,0',
        '            scale: 1.5',
        '      - type: bouncing_block',
        '        fall_damage_multiplier: 0',
        '      - type: drawer_block',
        '        max_stacks: 20',
        '        sounds:',
        '          put:',
        '            id: minecraft:block.decorated_pot.insert',
        '            pitch: 0.9~1',
      ].join('\n'),
    );
    expect(issues(project)).toEqual([]);
  });

  it('writes a stackable block with its amount states and the item that adds one', () => {
    const yaml = blocksOf(blockProject(preset('stackable_block')));
    expect(yaml).toContain(
      ['    behavior:', '      type: stackable_block', '      property: amount', '      items:', '        - bloecke:block_0'].join('\n'),
    );
    expect(yaml).toContain('          range: 1~3');
  });

  it('reports the keys a behavior cannot do without', () => {
    expect(issues(blockProject(preset('concrete_powder_block')))).toContainEqual([
      'ce.blockBehaviorKeyMissing',
      { behavior: 'concrete_powder_block', key: 'solid_block' },
    ]);
    const sapling = blockProject((item) => (item.rawYaml = 'block:\n  behaviors:\n    - type: sapling_block\n'));
    expect(issues(sapling)).toContainEqual([
      'ce.blockBehaviorKeyMissing',
      { behavior: 'sapling_block', key: 'feature / configured_feature / structure' },
    ]);
  });

  it('warns about a seagrass-like block without water', () => {
    const plant = (settings: ConfigObject) =>
      blockProject((item) => {
        const block = item.config.block as ConfigObject;
        block.behavior = { type: 'seagrass_like_block' };
        block.settings = { ...(block.settings as ConfigObject), ...settings };
      });
    expect(issues(plant({}))).toContainEqual(['ce.blockSeagrassWithoutWater', undefined]);
    expect(issues(plant({ fluid_state: 'water' })).map(([code]) => code)).not.toContain('ce.blockSeagrassWithoutWater');
  });

  it('reports a button without its items and items the project does not have', () => {
    expect(issues(blockProject(preset('button_block')))).toEqual(
      expect.arrayContaining([
        ['ce.blockButtonItemUnknown', { item: 'bloecke:block_0_not_pressed' }],
        ['ce.blockButtonItemUnknown', { item: 'bloecke:block_0_pressed' }],
      ]),
    );
    const without = blockProject((item) => {
      preset('button_block')(item);
      const states = (item.config.block as ConfigObject).states as ConfigObject;
      states.arguments = { button_base_block: 'oak_button' };
    });
    expect(issues(without)).toContainEqual(['ce.blockButtonItemMissing', { argument: 'button_pressed_item' }]);
  });
});
