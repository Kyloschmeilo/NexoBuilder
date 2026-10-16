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
import { withFacing } from '@resourcepackbuilder/core/craftEngine';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);
const FILE = 'resources/moebel/configuration/items/deko/deko.yml';
const TRANSPARENT = { type: 'sugar_cane', id: 'transparent' };

/** A CraftEngine project with one block item per edit, in the folder "Deko". */
function rendererProject(...edits: Array<[string, (item: Item) => void]>): Project {
  const project = createProject('Möbel', 'moebel', '26.3', 'craftengine');
  const folder = createFolder('Deko', null);
  insertFolder(project, folder);
  for (const [itemId, edit] of edits) {
    const item = createItem({
      displayName: itemId,
      itemId,
      folderId: folder.id,
      material: 'PAPER',
      model: createTextureModel('generated', { layer0: 'wood.png' }, [{ name: 'wood.png', dataUrl: PNG16 }]),
    });
    item.config.block = { state: { auto_state: 'solid' } };
    edit(item);
    insertItem(project, item);
  }
  return project;
}

const blocksOf = (project: Project) =>
  (parse(pluginText(planExport(project), FILE)) as { blocks: Record<string, Record<string, unknown>> }).blocks;
const codes = (project: Project) => planExport(project).issues.map((i) => [i.code, i.args]);

describe('CraftEngine block entity renderers', () => {
  it('writes a transparent state drawn by an item display of the block item', () => {
    const project = rendererProject([
      'sign_post',
      (item) =>
        (item.config.block = { state: { auto_state: TRANSPARENT, transparent: true, entity_renderer: [{ type: 'item_display' }] } }),
    ]);
    expect(blocksOf(project)['moebel:sign_post'].state).toEqual({
      auto_state: TRANSPARENT,
      transparent: true,
      entity_renderer: [{ type: 'item_display', item: 'moebel:sign_post' }],
    });
    expect(pluginText(planExport(project), FILE)).toContain(
      [
        '    state:',
        '      auto_state:',
        '        type: sugar_cane',
        '        id: transparent',
        '      transparent: true',
        '      entity_renderer:',
        '        - type: item_display',
        '          item: moebel:sign_post',
      ].join('\n'),
    );
    expect(codes(project)).toEqual([]);
  });

  it('keeps the block model under a renderer that is not transparent', () => {
    const project = rendererProject([
      'pedestal',
      (item) =>
        (item.config.block = {
          state: { auto_state: 'solid', entity_renderer: { text: '<yellow>Hello', translation: '0,1,0', billboard: 'center' } },
        }),
    ]);
    const state = blocksOf(project)['moebel:pedestal'].state as Record<string, unknown>;
    expect(state.model).toEqual({
      path: 'moebel:block/deko/pedestal-block',
      generation: { parent: 'minecraft:block/cube_all', textures: { all: 'moebel:block/deko/pedestal/wood' } },
    });
    expect(state.entity_renderer).toEqual({ type: 'text_display', text: '<yellow>Hello', billboard: 'center', translation: '0,1,0' });
  });

  it('writes a renderer per appearance, as the jar’s sofa does (on a fixed vanilla state, without the item model)', () => {
    const look = (rotation?: number) => ({
      state: 'barrier',
      entity_renderer: [{ item: 'moebel:sofa', ...(rotation ? { rotation } : {}), tint_source: 'minecraft:dyed_color' }],
    });
    const project = rendererProject([
      'sofa',
      (item) =>
        (item.config.block = {
          states: {
            properties: { facing: { type: 'horizontal_direction', default: 'north' } },
            appearances: { north: look(), east: look(90), south: look(180), west: look(270) },
            variants: {
              'facing=north': { appearance: 'north' },
              'facing=east': { appearance: 'east' },
              'facing=south': { appearance: 'south' },
              'facing=west': { appearance: 'west' },
            },
          },
        }),
    ]);
    const appearances = (blocksOf(project)['moebel:sofa'].states as { appearances: Record<string, unknown> }).appearances;
    expect(appearances.east).toEqual({
      state: 'barrier',
      entity_renderer: [{ type: 'item_display', item: 'moebel:sofa', rotation: 90, tint_source: 'minecraft:dyed_color' }],
    });
    expect(codes(project)).toEqual([]);
  });

  it('turns a renderer on a fixed vanilla state when the block faces the player, without a model', () => {
    const project = rendererProject([
      'sofa',
      (item) =>
        (item.config.block = {
          states: withFacing({
            properties: {},
            appearances: { sofa: { state: 'barrier', entity_renderer: [{ type: 'item_display' }] } },
            variants: {},
          }),
        }),
    ]);
    const appearances = (blocksOf(project)['moebel:sofa'].states as { appearances: Record<string, unknown> }).appearances;
    expect(appearances).toEqual({
      sofa_north: { state: 'barrier', entity_renderer: [{ type: 'item_display', item: 'moebel:sofa' }] },
      sofa_east: { state: 'barrier', entity_renderer: [{ type: 'item_display', item: 'moebel:sofa', yaw: 90 }] },
      sofa_south: { state: 'barrier', entity_renderer: [{ type: 'item_display', item: 'moebel:sofa', yaw: 180 }] },
      sofa_west: { state: 'barrier', entity_renderer: [{ type: 'item_display', item: 'moebel:sofa', yaw: -90 }] },
    });
    expect(codes(project)).toEqual([]);
  });

  it('leaves out a model with only a rotation on a renderer of a fixed vanilla state', () => {
    const project = rendererProject([
      'sofa',
      (item) => (item.config.block = { state: { state: 'barrier', model: { y: 90 }, entity_renderer: [{ type: 'item_display' }] } }),
    ]);
    expect(blocksOf(project)['moebel:sofa'].state).toEqual({
      state: 'barrier',
      entity_renderer: [{ type: 'item_display', item: 'moebel:sofa' }],
    });
  });

  it('builds a renderer written in the additional YAML', () => {
    const project = rendererProject([
      'lamp',
      (item) => (item.rawYaml = 'block:\n  state:\n    entity_render:\n      block: minecraft:lantern\n'),
    ]);
    expect((blocksOf(project)['moebel:lamp'].state as Record<string, unknown>).entity_render).toEqual({
      type: 'block_display',
      block: 'minecraft:lantern',
    });
  });

  it('reports what CraftEngine cannot read, and a transparent look without a renderer', () => {
    const project = rendererProject(
      [
        'broken',
        (item) =>
          (item.config.block = {
            states: {
              properties: { lit: { type: 'boolean', default: false } },
              appearances: {
                off: { auto_state: 'solid', transparent: true },
                on: {
                  auto_state: 'solid',
                  entity_renderer: [
                    { type: 'hologram' },
                    { type: 'block_display' },
                    { item: 'moebel:missing', position: 'up', rotation: '1,2,3,4,5' },
                  ],
                },
              },
              variants: { 'lit=false': { appearance: 'off' }, 'lit=true': { appearance: 'on' } },
            },
          }),
      ],
      ['plain', (item) => (item.config.block = { state: { auto_state: 'solid', entity_renderer: { scale: 'big' } } })],
    );
    expect(codes(project)).toEqual([
      ['ce.blockTransparentInvisible', { look: 'off' }],
      ['ce.blockRendererTypeInvalid', { look: 'on', type: 'hologram' }],
      ['ce.blockRendererKeyMissing', { look: 'on', type: 'block_display', key: 'block' }],
      ['ce.blockRendererItemUnknown', { look: 'on', item: 'moebel:missing' }],
      ['ce.blockRendererValueInvalid', { look: 'on', key: 'position', value: 'up' }],
      ['ce.blockRendererValueInvalid', { look: 'on', key: 'rotation', value: '1,2,3,4,5' }],
      ['ce.blockRendererValueInvalid', { look: 'state', key: 'scale', value: 'big' }],
    ]);
  });
});
