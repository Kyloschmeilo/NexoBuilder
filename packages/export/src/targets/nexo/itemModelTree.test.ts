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

function project(edit: (item: Item) => void, withModel = true, editProject: (p: ReturnType<typeof createProject>) => void = () => {}) {
  const p = createProject('Deko', 'deko', '1.21.11');
  editProject(p);
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
    // Nexo's ItemModelBuilder reads the definition's root keys next to `model` (the vanilla definition's shape)
    expect(yaml.ItemModel).toEqual({
      model: {
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
      },
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
    expect(yaml.ItemModel.model.type).toBe('minecraft:composite');
    const issue = plan.issues.find((i) => i.code === 'plan.itemModelTreeReplacesGenerated');
    expect(issue).toMatchObject({ level: 'warning', args: { slots: 'gui_model' } });
  });

  it('reports the problems of the tree in the item’s context', () => {
    const { plan, yaml } = project((item) => (item.itemModel = { model: { type: 'minecraft:model', model: '@model' } }), false);
    const issue = plan.issues.find((i) => i.code === 'plan.itemModelMainModelMissing');
    expect(issue?.level).toBe('error');
    expect(issue?.context?.map((frame) => frame.code)).toEqual(['context.item', 'context.itemModelNode']);
    expect(yaml.ItemModel).toEqual({ model: { type: 'minecraft:model', model: '@model' } });
  });

  it('leaves the tree out when the additional YAML sets ItemModel itself', () => {
    const { plan, yaml } = project((item) => {
      item.itemModel = PLUSHIE;
      item.rawYaml = 'ItemModel:\n  type: minecraft:empty\n';
    });
    expect(yaml.ItemModel).toEqual({ type: 'minecraft:empty' });
    expect(plan.issues.some((i) => i.code === 'plan.itemModelTreeOverriddenByRawYaml' && i.level === 'warning')).toBe(true);
  });

  it('says which Pack variants stop working under the tree', () => {
    const { plan } = project((item) => {
      item.config.material = 'BOW';
      item.variants = { pulling_models: [model('p0')] };
      item.itemModel = PLUSHIE;
    });
    expect(plan.issues.find((i) => i.code === 'plan.itemModelTreeDisablesVariants')).toMatchObject({
      level: 'warning',
      args: { variants: 'pulling_models' },
    });
  });

  it('needs item model definitions (1.21.4)', () => {
    const { plan } = project(
      (item) => (item.itemModel = PLUSHIE),
      true,
      (p) => (p.settings.minecraftVersion = '1.21.1'),
    );
    expect(plan.issues.find((i) => i.code === 'plan.itemModelTreeNeedsVersion')).toMatchObject({
      level: 'error',
      args: { version: '1.21.4' },
    });
  });

  it('points item_model at the tree even without the item model setting', () => {
    const { yaml } = project(
      (item) => (item.itemModel = PLUSHIE),
      true,
      (p) => (p.settings.useItemModel = false),
    );
    expect(yaml.Components.item_model).toBe('nexo:plushie');
  });

  it('warns when another item_model keeps the tree from showing', () => {
    const { plan, yaml } = project((item) => {
      item.itemModel = PLUSHIE;
      item.config.Components = { item_model: 'nexo:empty' };
    });
    expect(yaml.Components.item_model).toBe('nexo:empty');
    expect(plan.issues.find((i) => i.code === 'plan.itemModelTreeUnused')).toMatchObject({
      level: 'warning',
      args: { itemModel: 'nexo:empty' },
    });
  });

  it('warns when a Pack key disagrees with the tree’s root key (the tree wins)', () => {
    const { plan, yaml } = project((item) => {
      item.itemModel = { ...PLUSHIE, swap_animation_scale: 2 };
      item.config.Pack = { oversized_in_gui: false, swap_animation_scale: 2 };
    });
    expect(yaml.ItemModel.oversized_in_gui).toBe(true);
    const conflicts = plan.issues.filter((i) => i.code === 'plan.itemModelTreeRootKeyConflict');
    expect(conflicts.map((i) => i.args)).toEqual([{ key: 'oversized_in_gui', packKey: 'Pack.oversized_in_gui' }]);
  });
});
