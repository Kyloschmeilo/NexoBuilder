import { describe, expect, it } from 'vitest';
import {
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
import { goldenCraftEngineProject } from '../../golden/fixture';
import { itemYamlPreview } from '../../itemPreview';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);
const MISC_FILE = 'resources/kristall_pack/configuration/items/kram/kram.yml';
const BLOCK_FILE = 'resources/bloecke/configuration/items/steine/steine.yml';

/** A flat item model with one layer per texture name. */
const layered = (...names: string[]) =>
  createTextureModel(
    'generated',
    Object.fromEntries(names.map((name, i) => [`layer${i}`, `${name}.png`])),
    names.map((name) => ({ name: `${name}.png`, dataUrl: PNG16 })),
  );

/** A CraftEngine project with blocks from `edits`, one item each, in the folder "Steine". */
function blockProject(version: string, ...edits: Array<(item: Item) => void>): Project {
  const project = createProject('Blöcke', 'bloecke', version, 'craftengine');
  const folder = createFolder('Steine', null);
  insertFolder(project, folder);
  edits.forEach((edit, i) => {
    const item = createItem({
      displayName: `Block ${i}`,
      itemId: `block_${i}`,
      folderId: folder.id,
      material: 'PAPER',
      model: layered('stone'),
    });
    item.config.block = { state: { auto_state: 'solid' } };
    edit(item);
    insertItem(project, item);
  });
  return project;
}

const blockOf = (project: Project) => {
  const yaml = pluginText(planExport(project), BLOCK_FILE);
  return yaml.slice(yaml.indexOf('blocks:'));
};
const codes = (project: Project) => planExport(project).issues.map((i) => i.code);

describe('CraftEngine blocks', () => {
  it('writes the block under blocks: and makes the item place it', () => {
    expect(pluginText(planExport(goldenCraftEngineProject()), MISC_FILE)).toBe(
      [
        '# Created with ResourcepackBuilder – project "Kristall Pack"',
        'items:',
        '  kristall:pebble:',
        '    material: paper',
        '    data:',
        '      item_name: Stein',
        '  kristall:crystal_block:',
        '    material: paper',
        '    data:',
        '      item_name: Kristallblock',
        '    model: kristall:block/kram/crystal_block',
        '    behavior:',
        '      type: block_item',
        '      block: kristall:crystal_block',
        '',
        'blocks:',
        '  kristall:crystal_block:',
        '    state:',
        '      auto_state: solid',
        '      model:',
        '        path: kristall:block/kram/crystal_block',
        '    settings:',
        '      hardness: 3',
        '      tags:',
        '        - minecraft:mineable/pickaxe',
        '    loot:',
        '      template: default:loot_table/self',
        '',
      ].join('\n'),
    );
  });

  it('puts the model and textures of a block into models/block and textures/block', () => {
    const files = [...planExport(goldenCraftEngineProject()).packFiles.keys()];
    expect(files).toEqual(
      expect.arrayContaining([
        'assets/kristall/models/block/kram/crystal_block.json',
        'assets/kristall/textures/block/kram/crystal_block/crystal_block.png',
      ]),
    );
  });

  it('shows the block in the preview', () => {
    const project = goldenCraftEngineProject();
    const block = Object.values(project.items).find((item) => item.itemId === 'crystal_block');
    if (!block) throw new Error('no block');
    expect(itemYamlPreview(planExport(project), block.id)).toMatch(/\n\nblocks:\n {2}kristall:crystal_block:\n {4}state:\n/);
  });

  it('builds a cube from one texture of a flat model', () => {
    expect(blockOf(blockProject('1.21.11', () => {}))).toBe(
      [
        'blocks:',
        '  bloecke:block_0:',
        '    state:',
        '      auto_state: solid',
        '      model:',
        '        path: bloecke:block/steine/block_0-block',
        '        generation:',
        '          parent: minecraft:block/cube_all',
        '          textures:',
        '            all: bloecke:block/steine/block_0/stone',
        '',
      ].join('\n'),
    );
  });

  it('builds a column from two textures and a bottom/side/top cube from three', () => {
    const column = blockProject('1.21.11', (item) => (item.model = layered('log_top', 'log_side')));
    expect(blockOf(column)).toContain(
      [
        '          parent: minecraft:block/cube_column',
        '          textures:',
        '            end: bloecke:block/steine/block_0/log_top',
        '            side: bloecke:block/steine/block_0/log_side',
      ].join('\n'),
    );
    const bottomTop = blockProject('1.21.11', (item) => (item.model = layered('bottom', 'side', 'top')));
    expect(blockOf(bottomTop)).toContain(
      [
        '          parent: minecraft:block/cube_bottom_top',
        '          textures:',
        '            bottom: bloecke:block/steine/block_0/bottom',
        '            side: bloecke:block/steine/block_0/side',
        '            top: bloecke:block/steine/block_0/top',
      ].join('\n'),
    );
  });

  it('uses three textures at most and reports the others', () => {
    const project = blockProject('1.21.11', (item) => (item.model = layered('a', 'b', 'c', 'd')));
    expect(blockOf(project)).toContain('parent: minecraft:block/cube_bottom_top');
    expect(planExport(project).issues.find((i) => i.code === 'ce.blockExtraTextures')?.args).toEqual({ max: 3, count: 1 });
  });

  it('keeps a model the state sets itself', () => {
    const project = blockProject(
      '1.21.11',
      (item) => (item.config.block = { state: { auto_state: 'solid', model: { path: 'a:block/b' } } }),
    );
    expect(blockOf(project)).toContain('      model:\n        path: a:block/b\n');
  });

  it('reports a block without a model, a state or a known auto_state group', () => {
    expect(codes(blockProject('1.21.11', (item) => (item.model = null)))).toContain('ce.blockMissingModel');
    expect(codes(blockProject('1.21.11', (item) => (item.config.block = { settings: { hardness: 1 } })))).toContain('ce.blockStateMissing');
    const unknown = planExport(blockProject('1.21.11', (item) => (item.config.block = { state: { auto_state: 'glass' } })));
    expect(unknown.issues.find((i) => i.code === 'ce.blockAutoStateInvalid')?.args).toEqual({ group: 'glass' });
    expect(codes(blockProject('1.21.11', () => {}))).not.toContain('ce.blockStateMissing');
  });

  it('warns when the blocks of a group need more states than the group has', () => {
    const sugarCane = (item: Item) => (item.config.block = { state: { auto_state: 'sugar_cane' } });
    const budget = (count: number) =>
      planExport(blockProject('1.21.11', ...Array.from({ length: count }, () => sugarCane))).issues.filter(
        (i) => i.code === 'ce.autoStateBudget',
      );
    expect(budget(16).map((i) => [i.level, i.args])).toEqual([['warning', { group: 'sugar_cane', used: 16, capacity: 15 }]]);
    expect(budget(15)).toEqual([]);
  });
});
