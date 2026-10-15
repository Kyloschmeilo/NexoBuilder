/**
 * Transfer properties of one item to other items – everything except what defines an item:
 * display name, item ID, model (incl. variants), folder and model data
 * such as custom_model_data.
 */
import type { ConfigObject, ConfigValue, Item, ModelTexture, Project } from '../types';
import { deepClone, isPlainObject, uid } from '../util';
import { deletePath, getPath, setPath } from './configPath';
import { ASSET_TOKEN_PREFIX, MANAGED_TOP_LEVEL_KEYS, PROPERTIES, PROPERTY_GROUPS, type PropertyDef, type PropertyGroup } from './schema';
import type { Recipe } from './recipes';

export type CopyCategory = 'material' | PropertyGroup | 'other' | 'rawYaml' | 'recipes';

export const COPY_CATEGORIES: Array<{ id: CopyCategory; label: string; description: string; defaultOn: boolean }> = [
  { id: 'material', label: 'Material', description: 'Basis-Material (z.B. DIAMOND_SWORD)', defaultOn: true },
  ...PROPERTY_GROUPS.map((g) => ({ id: g.id as CopyCategory, label: g.label, description: g.description, defaultOn: true })),
  { id: 'other', label: 'Sonstige Werte', description: 'Werte ohne eigenes Formular (z.B. aus importierten Configs)', defaultOn: true },
  { id: 'rawYaml', label: 'Zusätzliches YAML (YAML-Tab)', description: 'Der Inhalt des YAML-Tabs', defaultOn: true },
  {
    id: 'recipes',
    label: 'Recipes',
    description: 'Crafting-Rezepte – Achtung: gleiche Rezepte für mehrere Items stören sich im Spiel',
    defaultOn: false,
  },
];

/** Values that are never copied: they belong to the model and must be unique per item. */
export const NEVER_COPIED_PROPERTIES = new Set(['Pack.custom_model_data']);

export interface ItemConfigClipboard {
  format: 'resourcepackbuilder-item-config';
  sourceItemId: string;
  sourceName: string;
  sourceNexoId: string;
  projectId: string;
  config: ConfigObject;
  rawYaml: string;
  /** Extra textures referenced by the config (@asset:…) */
  assets: Record<string, ModelTexture>;
  recipes: Recipe[];
}

export function copyItemConfig(item: Item, projectId: string): ItemConfigClipboard {
  return {
    format: 'resourcepackbuilder-item-config',
    sourceItemId: item.id,
    sourceName: item.displayName,
    sourceNexoId: item.nexoId,
    projectId,
    config: deepClone(item.config),
    rawYaml: item.rawYaml,
    assets: deepClone(item.assets ?? {}),
    recipes: deepClone(item.recipes ?? []),
  };
}

const copyableProperties = (group: PropertyGroup): PropertyDef[] =>
  PROPERTIES.filter((p) => p.group === group && !NEVER_COPIED_PROPERTIES.has(p.id));

/** Top-level keys that belong to no property (e.g. from imported configs) */
function otherKeys(config: ConfigObject): string[] {
  const roots = new Set(PROPERTIES.map((p) => p.path[0]));
  return Object.keys(config).filter((k) => !roots.has(k) && !MANAGED_TOP_LEVEL_KEYS.includes(k));
}

/**
 * Unknown sub-keys in Components/Mechanics (that have no property of their own).
 * Unknown keys under Pack (model, textures, parent_model …) belong to the model and stay with the target.
 */
function otherNestedPaths(config: ConfigObject): string[][] {
  const known = new Set(PROPERTIES.map((p) => p.path.join('.')));
  const sections = new Set(PROPERTIES.filter((p) => p.path.length > 1 && p.path[0] !== 'Pack').map((p) => p.path[0]));
  const result: string[][] = [];
  for (const section of sections) {
    const value = config[section];
    if (!isPlainObject(value)) continue;
    for (const key of Object.keys(value)) {
      const path = [section, key];
      if (!known.has(path.join('.')) && !NEVER_COPIED_PROPERTIES.has(path.join('.'))) result.push(path);
    }
  }
  return result;
}

export interface CategorySummary {
  id: CopyCategory;
  /** Names of the contained properties (for display) */
  entries: string[];
}

/** What the clipboard contains per category. */
export function summarizeClipboard(clip: ItemConfigClipboard): CategorySummary[] {
  const config = clip.config;
  return COPY_CATEGORIES.map(({ id }) => {
    let entries: string[] = [];
    if (id === 'material') entries = typeof config.material === 'string' ? [config.material] : [];
    else if (id === 'other') entries = [...otherKeys(config), ...otherNestedPaths(config).map((p) => p.join('.'))];
    else if (id === 'rawYaml') entries = clip.rawYaml.trim() ? [`${clip.rawYaml.trim().split('\n').length} Zeile(n)`] : [];
    else if (id === 'recipes') entries = clip.recipes.map((r) => r.type);
    else entries = copyableProperties(id).filter((p) => getPath(config, p.path) !== undefined).map((p) => p.label);
    return { id, entries };
  });
}

export interface PasteOptions {
  categories: ReadonlySet<CopyCategory>;
  /**
   * replace: The target gets exactly the source values in the selected categories
   *          (properties that only exist on the target are removed).
   * merge:   Only add or overwrite what the source has.
   */
  mode: 'replace' | 'merge';
}

/**
 * Applies the selected categories to an item (mutates `target`, e.g. in an Immer draft).
 * `project` is needed for unique block variations.
 */
export function pasteItemConfig(project: Project, target: Item, clip: ItemConfigClipboard, options: PasteOptions): void {
  if (target.id === clip.sourceItemId) return;
  const { categories, mode } = options;
  const source = clip.config;
  const config = target.config;

  const transfer = (path: string[]) => {
    const value = getPath(source, path);
    if (value !== undefined) setPath(config, path, deepClone(value));
    else if (mode === 'replace') deletePath(config, path);
  };

  if (categories.has('material')) {
    if (typeof source.material === 'string') config.material = source.material;
    else if (mode === 'replace') delete config.material;
  }
  for (const group of PROPERTY_GROUPS) {
    if (!categories.has(group.id)) continue;
    for (const def of copyableProperties(group.id)) transfer(def.path);
  }
  if (categories.has('other')) {
    const keys = new Set([...otherKeys(source), ...(mode === 'replace' ? otherKeys(config) : [])]);
    for (const key of keys) transfer([key]);
    const nested = new Map<string, string[]>();
    for (const path of [...otherNestedPaths(source), ...(mode === 'replace' ? otherNestedPaths(config) : [])]) nested.set(path.join('.'), path);
    for (const path of nested.values()) transfer(path);
  }
  if (categories.has('rawYaml') && (clip.rawYaml.trim() || mode === 'replace')) target.rawYaml = clip.rawYaml;
  if (categories.has('recipes') && (clip.recipes.length > 0 || mode === 'replace')) {
    const copies = clip.recipes.map((r) => ({ ...deepClone(r), id: uid('r_') }));
    target.recipes = mode === 'replace' ? copies : [...(target.recipes ?? []), ...copies];
  }

  keepBlockVariationUnique(project, target);
  syncAssets(target, clip);
}

/** Custom blocks need their own variation per type – otherwise it would be the same block. */
function keepBlockVariationUnique(project: Project, target: Item) {
  const block = getPath(target.config, ['Mechanics', 'custom_block']);
  if (!isPlainObject(block) || typeof block.custom_variation !== 'number') return;
  const type = typeof block.type === 'string' ? block.type : '';
  const used = new Set<number>();
  for (const item of Object.values(project.items)) {
    if (item.id === target.id) continue;
    const other = getPath(item.config, ['Mechanics', 'custom_block']);
    if (isPlainObject(other) && other.type === type && typeof other.custom_variation === 'number') used.add(other.custom_variation);
  }
  if (!used.has(block.custom_variation)) return;
  let next = 1;
  while (used.has(next)) next++;
  (block as Record<string, ConfigValue>).custom_variation = next;
}

/** Takes over referenced extra textures and removes ones no longer used. */
function syncAssets(target: Item, clip: ItemConfigClipboard) {
  const used = JSON.stringify(target.config) + target.rawYaml;
  target.assets = target.assets ?? {};
  for (const [id, asset] of Object.entries(clip.assets)) {
    if (used.includes(`${ASSET_TOKEN_PREFIX}${id}`) && !target.assets[id]) target.assets[id] = deepClone(asset);
  }
  for (const id of Object.keys(target.assets)) {
    if (!used.includes(`${ASSET_TOKEN_PREFIX}${id}`)) delete target.assets[id];
  }
}
