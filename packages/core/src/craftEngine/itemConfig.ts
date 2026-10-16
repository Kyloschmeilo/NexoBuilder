/**
 * Builds the CraftEngine item config (one entry under `items:`) from an item:
 *  1. clean up the structured config (remove empty fields, keep values without a property)
 *  2. add the automatic values (material, data.item_name, model or models)
 *  3. overlay the user's additional YAML, which wins
 */
import { deepClone, deepMerge, isPlainObject } from '@resourcepackbuilder/utils';
import type { Item, Project } from '../project/types';
import { itemMaterial } from '../project/item';
import { cleanConfig } from '../form/prune';
import { parseRawYaml, type RawYamlError } from '../yaml';
import { CRAFT_ENGINE_FORM } from './form/schema';

/** Order of the keys in the YAML (as in the CraftEngine docs); other keys follow in their own order. */
const TOP_LEVEL_ORDER = ['material', 'client_bound_material', 'data', 'model', 'models', 'settings', 'behavior', 'events'];

export interface CraftEngineBuildContext {
  project: Project;
  item: Item;
  /** "namespace:path" of the main model, or null if the item has none */
  modelKey: string | null;
  /** All models in CraftEngine's slot order for materials with several states (bow, crossbow …); written as `models:` */
  models?: string[] | null;
}

export interface CraftEngineBuildResult {
  config: Record<string, unknown>;
  rawYamlError: RawYamlError | null;
}

/** The key of an item under `items:`, e.g. "ruby:ruby_sword". */
export function craftEngineItemKey(project: Pick<Project, 'namespace'>, item: Pick<Item, 'itemId'>): string {
  return `${project.namespace}:${item.itemId}`;
}

/** The item's base material as CraftEngine writes it (lower case, e.g. "diamond_sword"). */
export function craftEngineMaterial(item: Item): string {
  return itemMaterial(item).toLowerCase();
}

export function buildCraftEngineItem(context: CraftEngineBuildContext): CraftEngineBuildResult {
  const { item, modelKey, models } = context;
  const resolved: Record<string, unknown> = cleanConfig(CRAFT_ENGINE_FORM, deepClone(item.config));

  // The managed paths are set below, whatever the config holds there
  delete resolved.material;
  const data = isPlainObject(resolved.data) ? resolved.data : {};
  delete data.item_name;
  const name = item.displayName.trim();
  const withName = name ? { item_name: name, ...data } : data;
  if (Object.keys(withName).length > 0) resolved.data = withName;
  else delete resolved.data;

  const result: Record<string, unknown> = { material: craftEngineMaterial(item) };
  if (models && models.length > 0) resolved.models = models;
  else if (modelKey) resolved.model = modelKey;
  for (const key of TOP_LEVEL_ORDER) {
    if (resolved[key] !== undefined && result[key] === undefined) result[key] = resolved[key];
  }
  for (const [key, value] of Object.entries(resolved)) {
    if (result[key] === undefined) result[key] = value;
  }

  const raw = parseRawYaml(item.rawYaml);
  return { config: raw.value ? deepMerge(result, raw.value) : result, rawYamlError: raw.error };
}
