/** CraftEngine: the item model tree of an item, written as its `model` in CraftEngine's form. */
import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem, type Item } from '@resourcepackbuilder/core/project';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';

const PNG16 = makePngDataUrl(16, 16);
const png = (name: string) => createTextureModel('handheld', { layer0: name }, [{ name, dataUrl: PNG16 }]);

/** The plan of a CraftEngine project with one item (a bow with pulling models), changed by `edit`. */
function plan(edit: (item: Item) => void, withModel = true) {
  const project = createProject('Bögen', 'boegen', '26.3', 'craftengine');
  const folder = createFolder('Waffen', null);
  insertFolder(project, folder);
  const item = createItem({
    displayName: 'Bogen',
    itemId: 'bow',
    folderId: folder.id,
    material: 'BOW',
    model: withModel ? png('b.png') : null,
  });
  if (withModel) item.variants = { pulling_models: [png('p0.png'), png('p1.png'), png('p2.png')] };
  edit(item);
  insertItem(project, item);
  return planExport(project);
}

describe('CraftEngine item model tree', () => {
  it('writes the tree as model instead of the generated models, with path for model references', () => {
    const result = plan((item) => {
      item.itemModel = {
        model: {
          type: 'minecraft:condition',
          property: 'minecraft:using_item',
          on_true: {
            type: 'minecraft:range_dispatch',
            property: 'minecraft:use_duration',
            scale: 0.05,
            entries: [{ threshold: 0.65, model: { type: 'minecraft:model', model: 'boegen:item/waffen/bow-pulling_1' } }],
            fallback: { type: 'minecraft:model', model: '@model', tints: [{ type: 'minecraft:dye', default: 16777215 }] },
          },
          on_false: {
            type: 'minecraft:special',
            base: '@model',
            model: { type: 'minecraft:head', kind: 'zombie' },
            transformation: { translation: [0, 0.5, 0], left_rotation: [0, 0, 0, 1], scale: [1, 1, 1], right_rotation: [0, 0, 0, 1] },
          },
        },
        oversized_in_gui: true,
      };
    });
    const config = result.items[0].config;
    expect(config.models).toBeUndefined();
    expect(config.model).toEqual({
      type: 'minecraft:condition',
      property: 'minecraft:using_item',
      on_true: {
        type: 'minecraft:range_dispatch',
        property: 'minecraft:use_duration',
        scale: 0.05,
        entries: [{ threshold: 0.65, model: { type: 'minecraft:model', path: 'boegen:item/waffen/bow-pulling_1' } }],
        fallback: { type: 'minecraft:model', path: 'boegen:item/waffen/bow', tints: [{ type: 'minecraft:dye', default: 16777215 }] },
      },
      on_false: {
        type: 'minecraft:special',
        base: 'boegen:item/waffen/bow',
        model: { type: 'minecraft:head', kind: 'zombie' },
        transformation: { translation: '0,0.5,0', left_rotation: '0,0,0,1', scale: '1,1,1', right_rotation: '0,0,0,1' },
      },
    });
    // The root keys of CraftEngine are item keys of the model group, not of the tree
    expect(config.oversized_in_gui).toBeUndefined();
    expect(result.issues.filter((i) => i.level !== 'info')).toEqual([]);
  });

  it('lets the additional YAML win and says so', () => {
    const result = plan((item) => {
      item.itemModel = { model: { type: 'minecraft:empty' } };
      item.rawYaml = 'texture: a:item/bow';
    });
    expect(result.items[0].config.model).toBeUndefined();
    expect(result.items[0].config.texture).toBe('a:item/bow');
    expect(result.issues.some((i) => i.code === 'plan.itemModelTreeOverriddenByRawYaml' && i.level === 'warning')).toBe(true);
  });

  it('reports the problems of the tree', () => {
    const result = plan((item) => (item.itemModel = { model: { type: 'minecraft:model', model: '@model' } }), false);
    const issue = result.issues.find((i) => i.code === 'plan.itemModelMainModelMissing');
    expect(issue?.level).toBe('error');
    expect(issue?.context?.map((frame) => frame.code)).toEqual(['context.item', 'context.itemModelNode']);
  });
});
