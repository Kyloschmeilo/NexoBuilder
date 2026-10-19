/**
 * The item model definition tree (Minecraft 1.21.4+ `assets/<ns>/items/*.json`), stored target-neutrally on the item.
 * A node keeps the vanilla JSON shape: its `type` (`minecraft:model`, `minecraft:select` …) next to its own keys and
 * the keys of the property it reads (`property: minecraft:local_time` with `pattern`, `locale` …). The Nexo export
 * writes it as the item's `ItemModel`, the CraftEngine export as the item's `model` (export/targets/*).
 */
import type { ConfigValue } from '../types';

/** One node of the tree: its type and the keys of that type, in the vanilla JSON shape. */
export interface ItemModelNode {
  type: string;
  [key: string]: ConfigValue;
}

/** The tree of an item and the keys at the root of the definition. */
export interface ItemModelDefinition {
  /** The root node */
  model: ItemModelNode;
  /** Whether the first-person swap animation plays (vanilla default true); Nexo writes it into the definition */
  hand_animation_on_swap?: boolean;
  /** Whether the model may render beyond its GUI slot (1.21.6+); Nexo writes it into the definition */
  oversized_in_gui?: boolean;
  /** Speed of the swap animation (1.21.11+); Nexo writes it into the definition */
  swap_animation_scale?: number;
}

/** The keys at the root of a definition besides `model`. */
export const ITEM_MODEL_ROOT_KEYS = ['hand_animation_on_swap', 'oversized_in_gui', 'swap_animation_scale'] as const;

/** A root key of the definition besides `model`. */
export type ItemModelRootKey = (typeof ITEM_MODEL_ROOT_KEYS)[number];

/** The node types, in the order the editor offers them. */
export const ITEM_MODEL_TYPES = [
  'minecraft:model',
  'minecraft:composite',
  'minecraft:condition',
  'minecraft:select',
  'minecraft:range_dispatch',
  'minecraft:special',
  'minecraft:empty',
  'minecraft:bundle/selected_item',
] as const;

/** A node type. */
export type ItemModelType = (typeof ITEM_MODEL_TYPES)[number];

/** A step from a node to one of its children: a key, or a key and a list index. */
export type ItemModelPathStep = string | number;

/** The path of a node below the root (`[]` = the root), e.g. `['cases', 0, 'model']`. */
export type ItemModelPath = ItemModelPathStep[];
