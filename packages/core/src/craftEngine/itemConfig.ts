/**
 * Builds the CraftEngine item config (one entry under `items:`) from an item:
 *  1. clean up the structured config (remove empty fields, keep values without a property)
 *  2. add the automatic values (material, data.item_name, model or models)
 *  3. overlay the user's additional YAML, which wins
 * A block definition in `block` is no item key: it is returned as the block of the same key, with its state's model
 * filled in, and the item gets the behavior that places it.
 */
import type { JavaModelJson } from '@resourcepackbuilder/minecraft';
import { deepClone, deepMerge, isPlainObject } from '@resourcepackbuilder/utils';
import type { Item, Project } from '../project/types';
import { itemMaterial } from '../project/item';
import { cleanConfig } from '../form/prune';
import { parseRawYaml, type RawYamlError } from '../yaml';
import { CRAFT_ENGINE_FORM } from './form/schema';
import { craftEngineBlock, craftEngineBlockModel, type CraftEngineBlockModel } from './block';

/** Order of the keys in the YAML (as in the CraftEngine docs); other keys follow in their own order. */
const TOP_LEVEL_ORDER = ['material', 'client_bound_material', 'data', 'model', 'models', 'settings', 'behavior', 'events'];
/** Order of the keys of a block and of its state */
const BLOCK_ORDER = ['state', 'states', 'settings', 'behavior', 'behaviors', 'loot', 'events'];
const STATE_ORDER = ['auto_state', 'state', 'model', 'models'];
/** Keys of a state that give it its look (block/states.mdx, appearance keys); the generated model is added only without them */
const STATE_APPEARANCE_KEYS = ['model', 'models', 'texture', 'textures', 'blueprint', 'transparent'];

/**
 * The keys CraftEngine builds an item's look from (AbstractItemManager: `model(s)|texture(s)|blueprint|legacy_model`).
 * CraftEngine reads only the first of `model`/`models` it finds, so the raw YAML replaces the generated model
 * whenever it sets any of them.
 */
export const CE_MODEL_KEYS = ['model', 'models', 'texture', 'textures', 'blueprint', 'legacy_model'];

export interface CraftEngineBuildContext {
  project: Project;
  item: Item;
  /** "namespace:path" of the main model, or null if the item has none */
  modelKey: string | null;
  /** All models in CraftEngine's slot order for materials with several states (bow, crossbow …); written as `models:` */
  models?: string[] | null;
  /** The written main model, which a block's state shows */
  modelJson?: JavaModelJson | null;
}

export interface CraftEngineBuildResult {
  config: Record<string, unknown>;
  /** The block the item places (its entry under `blocks:`), null if the item is no block */
  block: Record<string, unknown> | null;
  /** How the block's state got its model (null if the item is no block or its state sets a model itself) */
  blockModel: CraftEngineBlockModel | null;
  rawYamlError: RawYamlError | null;
}

/** The key of an item under `items:`, e.g. "ruby:ruby_sword". */
export function craftEngineItemKey(project: Pick<Project, 'namespace'>, item: Pick<Item, 'itemId'>): string {
  return `${project.namespace}:${item.itemId}`;
}

/**
 * The item's base material as CraftEngine gets it: the raw YAML's `material` if it sets one, otherwise the app's
 * material in lower case (e.g. "diamond_sword").
 */
export function craftEngineMaterial(item: Item): string {
  const raw = parseRawYaml(item.rawYaml).value?.material;
  return typeof raw === 'string' ? raw : itemMaterial(item).toLowerCase();
}

/** Copies the keys of `source` in the given order first, the others after them. */
function ordered(source: Record<string, unknown>, order: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of order) if (source[key] !== undefined) result[key] = source[key];
  for (const [key, value] of Object.entries(source)) if (result[key] === undefined) result[key] = value;
  return result;
}

/** The block of the item with its state's model from the main model (unless the state sets its look itself). */
function buildBlock(source: Record<string, unknown>, context: CraftEngineBuildContext) {
  const state = isPlainObject(source.state) ? { ...source.state } : {};
  let blockModel: CraftEngineBlockModel | null = null;
  if (STATE_APPEARANCE_KEYS.every((key) => state[key] === undefined)) {
    blockModel = craftEngineBlockModel(context.modelKey, context.modelJson ?? null);
    if (blockModel.model) state.model = blockModel.model;
  }
  const block = ordered({ ...source, state: ordered(state, STATE_ORDER) }, BLOCK_ORDER);
  return { block, blockModel };
}

export function buildCraftEngineItem(context: CraftEngineBuildContext): CraftEngineBuildResult {
  const { project, item, modelKey, models } = context;
  const resolved: Record<string, unknown> = cleanConfig(CRAFT_ENGINE_FORM, deepClone(item.config));

  // Whether the item is a block is decided on the item's own config (as isBlockItem does), not on the cleaned one
  const built = craftEngineBlock(item.config) ? buildBlock(isPlainObject(resolved.block) ? resolved.block : {}, context) : null;
  delete resolved.block;
  if (built) resolved.behavior = { type: 'block_item', block: craftEngineItemKey(project, item) };

  // The managed paths are set below, whatever the config holds there
  delete resolved.material;
  const data = isPlainObject(resolved.data) ? resolved.data : {};
  delete data.item_name;
  const name = item.displayName.trim();
  const withName = name ? { item_name: name, ...data } : data;
  if (Object.keys(withName).length > 0) resolved.data = withName;
  else delete resolved.data;

  const raw = parseRawYaml(item.rawYaml);
  const rawSetsModel = raw.value !== null && CE_MODEL_KEYS.some((key) => raw.value?.[key] !== undefined);
  if (rawSetsModel) {
    delete resolved.model;
    delete resolved.models;
  } else if (models && models.length > 0) resolved.models = models;
  else if (modelKey) resolved.model = modelKey;
  const config = { material: itemMaterial(item).toLowerCase(), ...ordered(resolved, TOP_LEVEL_ORDER) };

  return {
    config: raw.value ? deepMerge(config, raw.value) : config,
    block: built?.block ?? null,
    blockModel: built?.blockModel ?? null,
    rawYamlError: raw.error,
  };
}
