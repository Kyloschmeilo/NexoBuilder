/**
 * The item's item model tree in CraftEngine's form (configuration/item/models): a model node names its model under
 * `path` (CraftEngine reads `path|model`, the wiki writes `path`), vectors and quaternions of a transformation are
 * written as `x,y,z` strings, and `@model` stands for the item's main model. The definition's root keys are not part of
 * it: CraftEngine reads them as item keys (the `model` group of the form).
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import { fullId, itemModelChildren, resolveItemModelTokens, updateItemModelAt, type ItemModelNode } from '../project/itemModel';
import type { ConfigObject, ConfigValue } from '../project/types';

/** A transformation's lists of numbers as CraftEngine's comma-separated strings (other values stay as they are). */
function transformationValue(value: ConfigValue): ConfigValue {
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value as ConfigObject).map(([key, entry]) => [
      key,
      Array.isArray(entry) && entry.every((n) => typeof n === 'number') ? entry.join(',') : entry,
    ]),
  );
}

/** One node and its children in CraftEngine's form. */
function convert(node: ItemModelNode): ItemModelNode {
  let result: ItemModelNode = Object.fromEntries(
    Object.entries(node).map(([key, value]) => {
      if (key === 'model' && fullId(node.type) === 'minecraft:model') return ['path', value];
      if (key === 'transformation') return [key, transformationValue(value)];
      return [key, value];
    }),
  ) as ItemModelNode;
  for (const child of itemModelChildren(node)) result = updateItemModelAt(result, child.path, () => convert(child.node));
  return result;
}

/** The tree as CraftEngine's `model` value, with `@model` resolved to the item's main model key. */
export function craftEngineItemModel(root: ItemModelNode, mainModelKey: string | null): ItemModelNode {
  return convert(resolveItemModelTokens(root, mainModelKey));
}
