/** The item model tree: building and changing nodes, reading stored trees, and the validation. */
import { describe, expect, it } from 'vitest';
import { ITEM_MODEL_TYPES, type ItemModelNode } from './types';
import {
  itemModelChildren,
  itemModelNodeAt,
  newItemModelNode,
  newSpecialModel,
  newTint,
  parseItemModelDefinition,
  resolveItemModelTokens,
  updateItemModelAt,
  usesMainModel,
  withNodeType,
  withProperty,
  withSpecialType,
  withTintType,
} from './tree';
import { formatItemModelPath, validateItemModelDefinition } from './validate';
import { ITEM_MODEL_PROPERTIES, ITEM_MODEL_SPECIAL_TYPES, ITEM_MODEL_TINT_TYPES, itemModelMessageKeys } from './catalog';

const context = { minecraftVersion: '26.3', hasMainModel: true };
const codes = (model: ItemModelNode, ctx = context) => validateItemModelDefinition({ model }, ctx).map((issue) => issue.code);

describe('item model tree', () => {
  it('builds a valid node of every type', () => {
    for (const type of ITEM_MODEL_TYPES) {
      const node = newItemModelNode(type);
      expect(node.type).toBe(type);
      expect(codes(node)).toEqual([]);
    }
  });

  it('fills in the required keys of every property, special model and tint source', () => {
    for (const [kind, defs] of Object.entries(ITEM_MODEL_PROPERTIES)) {
      const type = `minecraft:${kind}` as 'minecraft:select';
      for (const def of defs) expect(codes(withProperty(newItemModelNode(type), kind as 'select', def.id))).toEqual([]);
    }
    for (const def of ITEM_MODEL_SPECIAL_TYPES.filter((d) => !d.removedIn)) {
      expect(codes({ type: 'minecraft:special', base: '@model', model: newSpecialModel(def.id) })).toEqual([]);
    }
    for (const def of ITEM_MODEL_TINT_TYPES) {
      expect(codes({ type: 'minecraft:model', model: 'ns:item/a', tints: [newTint(def.id)] })).toEqual([]);
    }
  });

  it('drops the keys of the old property, special model or tint source', () => {
    const select = withProperty(newItemModelNode('minecraft:select'), 'select', 'local_time');
    expect(select).toMatchObject({ property: 'minecraft:local_time', pattern: 'MM' });
    const back = withProperty(select, 'select', 'minecraft:main_hand');
    expect(back.pattern).toBeUndefined();
    expect(back.cases).toEqual(select.cases);
    expect(withSpecialType({ type: 'minecraft:head', kind: 'zombie', animation: 1 }, 'chest')).toEqual({
      type: 'minecraft:chest',
      texture: 'minecraft:normal',
    });
    expect(withTintType({ type: 'minecraft:dye', default: 5 }, 'team')).toEqual({ type: 'minecraft:team', default: 5 });
  });

  it('keeps the first child when the type changes', () => {
    const condition: ItemModelNode = {
      type: 'minecraft:condition',
      property: 'minecraft:broken',
      on_true: { type: 'minecraft:model', model: 'ns:a' },
      on_false: { type: 'minecraft:empty' },
    };
    expect(withNodeType(condition, 'minecraft:composite').models).toEqual([{ type: 'minecraft:model', model: 'ns:a' }]);
    expect(withNodeType(condition, 'minecraft:select').fallback).toEqual({ type: 'minecraft:model', model: 'ns:a' });
    expect(withNodeType(condition, 'minecraft:condition')).toBe(condition);
  });

  it('reads and replaces nodes by path without mutating the tree', () => {
    const root = newItemModelNode('minecraft:select');
    expect(itemModelChildren(root).map((c) => c.path)).toEqual([['cases', 0, 'model'], ['fallback']]);
    const next = updateItemModelAt(root, ['cases', 0, 'model'], () => ({ type: 'minecraft:empty' }));
    expect(itemModelNodeAt(next, ['cases', 0, 'model'])).toEqual({ type: 'minecraft:empty' });
    expect(itemModelNodeAt(root, ['cases', 0, 'model'])?.type).toBe('minecraft:model');
    const removed = updateItemModelAt(next, ['fallback'], () => undefined);
    expect(removed.fallback).toBeUndefined();
    expect(updateItemModelAt(removed, ['cases', 0], () => undefined).cases).toEqual([]);
  });

  it('resolves the item’s own model in model and base references', () => {
    const tree: ItemModelNode = {
      type: 'minecraft:composite',
      models: [
        { type: 'minecraft:model', model: '@model' },
        { type: 'minecraft:special', base: '@model', model: { type: 'minecraft:shield' } },
        { type: 'minecraft:model', model: 'ns:other' },
      ],
    };
    expect(usesMainModel(tree)).toBe(true);
    expect(resolveItemModelTokens(tree, 'ns:item/sword')).toEqual({
      type: 'minecraft:composite',
      models: [
        { type: 'minecraft:model', model: 'ns:item/sword' },
        { type: 'minecraft:special', base: 'ns:item/sword', model: { type: 'minecraft:shield' } },
        { type: 'minecraft:model', model: 'ns:other' },
      ],
    });
    expect(usesMainModel({ type: 'minecraft:model', model: 'ns:other' })).toBe(false);
  });

  it('reads a stored definition leniently', () => {
    expect(parseItemModelDefinition({ model: { type: 'minecraft:empty' }, oversized_in_gui: true, swap_animation_scale: 'x' })).toEqual({
      model: { type: 'minecraft:empty' },
      oversized_in_gui: true,
    });
    expect(parseItemModelDefinition({ model: { model: 'ns:a' } })).toBeUndefined();
    expect(parseItemModelDefinition('x')).toBeUndefined();
  });

  it('has a message key for every text', () => {
    const keys = itemModelMessageKeys();
    expect(keys).toContain('itemModel.types.rangeDispatch.label');
    expect(keys).toContain('itemModel.properties.condition.fishingRodCast');
    expect(keys).toContain('itemModel.special.copperGolemStatue');
    expect(keys).toContain('itemModel.tints.mapColor');
    expect(keys).toContain('itemModel.transformation.leftRotation');
  });
});

describe('item model validation', () => {
  it('names the node by its path', () => {
    expect(formatItemModelPath([])).toBe('model');
    expect(formatItemModelPath(['cases', 1, 'model'])).toBe('model › cases[1] › model');
    const [issue] = validateItemModelDefinition({ model: { type: 'minecraft:model', model: '' } }, context);
    expect(issue).toEqual({
      level: 'error',
      code: 'plan.itemModelMissingKey',
      args: { key: 'model' },
      context: [{ code: 'context.itemModelNode', args: { path: 'model' } }],
    });
  });

  it('reports the item’s own model when the item has none', () => {
    expect(codes(newItemModelNode('minecraft:model'), { ...context, hasMainModel: false })).toEqual(['plan.itemModelMainModelMissing']);
  });

  it('reports unknown types and properties, missing keys and branches', () => {
    expect(codes({ type: 'minecraft:fancy' })).toEqual(['plan.itemModelUnknownType']);
    expect(codes({ type: 'minecraft:condition', property: 'minecraft:nope', on_true: { type: 'minecraft:empty' } })).toEqual([
      'plan.itemModelUnknownVariant',
      'plan.itemModelMissingBranch',
    ]);
    expect(codes({ type: 'minecraft:select', property: 'minecraft:local_time', cases: [] })).toEqual([
      'plan.itemModelMissingKey',
      'plan.itemModelEmptyList',
    ]);
    expect(codes({ type: 'minecraft:special', base: 'ns:a', model: { type: 'minecraft:banner' } })).toEqual(['plan.itemModelMissingKey']);
    expect(codes({ type: 'minecraft:model', model: 'ns:a', tints: [{ type: 'minecraft:constant' }] })).toEqual([
      'plan.itemModelMissingKey',
    ]);
  });

  it('reports cases without or with duplicate values and thresholds that are no numbers', () => {
    const empty = { type: 'minecraft:empty' };
    expect(
      codes({
        type: 'minecraft:select',
        property: 'minecraft:main_hand',
        cases: [
          { when: 'left', model: empty },
          { when: ['right', 'left'], model: empty },
          { when: '', model: empty },
        ],
      }),
    ).toEqual(['plan.itemModelDuplicateWhen', 'plan.itemModelCaseWithoutWhen']);
    expect(
      codes({
        type: 'minecraft:range_dispatch',
        property: 'minecraft:count',
        entries: [{ threshold: 'x', model: empty }, { threshold: 2 }],
      }),
    ).toEqual(['plan.itemModelThresholdInvalid', 'plan.itemModelMissingBranch']);
  });

  it('warns about features of newer or older Minecraft versions', () => {
    const old = { ...context, minecraftVersion: '1.21.4' };
    expect(codes({ type: 'minecraft:empty', transformation: { scale: [1, 1, 1] } })).toEqual(['plan.itemModelTransformationIgnored']);
    expect(codes({ type: 'minecraft:model', model: 'ns:a', transformation: { scale: [2, 2, 2] } }, old)).toEqual([
      'plan.itemModelNeedsVersion',
    ]);
    expect(codes({ type: 'minecraft:special', base: 'ns:a', model: { type: 'minecraft:player_head' } }, old)).toEqual([
      'plan.itemModelNeedsVersion',
    ]);
    expect(codes({ type: 'minecraft:special', base: 'ns:a', model: { type: 'minecraft:bed', texture: 'minecraft:red' } })).toEqual([
      'plan.itemModelRemoved',
    ]);
    expect(validateItemModelDefinition({ model: { type: 'minecraft:empty' }, oversized_in_gui: true }, old)[0]?.args).toMatchObject({
      feature: 'oversized_in_gui',
      version: '1.21.6',
    });
  });
});
