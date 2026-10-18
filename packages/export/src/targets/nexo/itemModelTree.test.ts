/** Nexo: the item model tree of an item, written as its `ItemModel`, and how it replaces the generated definitions. */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type ItemModelDefinition,
} from '@resourcepackbuilder/core/project';
import { createTextureModel, type ImportedModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);
const model = (name: string): ImportedModel =>
  createTextureModel('generated', { layer0: `${name}.png` }, [{ name: `${name}.png`, dataUrl: PNG16 }]);

const PLUSHIE: ItemModelDefinition = {
  model: {
    type: 'minecraft:composite',
    models: [
      { type: 'minecraft:model', model: '@model' },
      {
        type: 'minecraft:select',
        property: 'minecraft:local_time',
        pattern: 'MM',
        cases: [{ when: '12', model: { type: 'minecraft:model', model: 'deko:item/hat' } }],
        fallback: { type: 'minecraft:empty' },
      },
    ],
  },
  oversized_in_gui: true,
};

function project(edit: (item: Item) => void, withModel = true) {
  const p = createProject('Deko', 'deko', '1.21.11');
  const folder = createFolder('Plush', null);
  insertFolder(p, folder);
  const item = createItem({ displayName: 'Plushie', itemId: 'plushie', folderId: folder.id, model: withModel ? model('p') : null });
  edit(item);
  insertItem(p, item);
  const plan = planExport(p);
  const yaml = parse(pluginText(plan, 'items/plush/plush.yml')).plushie;
  return { plan, yaml };
}

describe('Nexo item model tree', () => {
  it('writes the tree as ItemModel with the item’s own model and the root keys', () => {
    const { plan, yaml } = project((item) => (item.itemModel = PLUSHIE));
    expect(yaml.ItemModel).toEqual({
      type: 'minecraft:composite',
      models: [
        { type: 'minecraft:model', model: 'deko:item/plush/plushie' },
        {
          type: 'minecraft:select',
          property: 'minecraft:local_time',
          pattern: 'MM',
          cases: [{ when: '12', model: { type: 'minecraft:model', model: 'deko:item/hat' } }],
          fallback: { type: 'minecraft:empty' },
        },
      ],
      oversized_in_gui: true,
    });
    expect(plan.issues.filter((i) => i.level !== 'info')).toEqual([]);
  });

  it('replaces the generated inventory icon definition', () => {
    const { plan, yaml } = project((item) => {
      item.itemModel = PLUSHIE;
      item.variants = { gui_model: [model('icon')] };
    });
    expect(plan.packFiles.has('assets/deko/items/plush/plushie.json')).toBe(false);
    expect(plan.packFiles.has('assets/deko/models/item/plush/plushie-gui.json')).toBe(false);
    expect(yaml.Components.item_model).toBe('nexo:plushie');
    expect(yaml.ItemModel.type).toBe('minecraft:composite');
    const issue = plan.issues.find((i) => i.code === 'plan.itemModelTreeReplacesGenerated');
    expect(issue).toMatchObject({ level: 'warning', args: { slots: 'gui_model' } });
  });

  it('reports the problems of the tree in the item’s context', () => {
    const { plan, yaml } = project((item) => (item.itemModel = { model: { type: 'minecraft:model', model: '@model' } }), false);
    const issue = plan.issues.find((i) => i.code === 'plan.itemModelMainModelMissing');
    expect(issue?.level).toBe('error');
    expect(issue?.context?.map((frame) => frame.code)).toEqual(['context.item', 'context.itemModelNode']);
    expect(yaml.ItemModel).toEqual({ type: 'minecraft:model', model: '@model' });
  });

  it('leaves the tree out when the additional YAML sets ItemModel itself', () => {
    const { plan, yaml } = project((item) => {
      item.itemModel = PLUSHIE;
      item.rawYaml = 'ItemModel:\n  type: minecraft:empty\n';
    });
    expect(yaml.ItemModel).toEqual({ type: 'minecraft:empty' });
    expect(plan.issues.some((i) => i.code === 'plan.itemModelTreeOverriddenByRawYaml' && i.level === 'warning')).toBe(true);
  });
});
