/**
 * Transfer properties of one item to other items – everything except what defines an item:
 * display name, item ID, model (incl. variants), folder and model data
 * such as custom_model_data.
 */
import type { ModelTexture } from '@resourcepackbuilder/minecraft';
import { assetToken, deepClone, isPlainObject, stripFormatting, uid } from '@resourcepackbuilder/utils';
import { referencedAssetIds } from '../project/assets';
import type { ConfigObject, ConfigValue, Item, Project } from '../project/types';
import type { ArmorSettings } from '../project/armor';
import { deletePath, getPath, setPath } from '../project/config';
import { getPropertyValue, isPropertyActive, setPropertyValue } from './form/properties';
import { getRecipeTypeInfo, type Recipe } from '../project/recipes/model';
import {
  MANAGED_TOP_LEVEL_KEYS,
  PROPERTIES,
  PROPERTY_GROUPS,
  unknownConfigPaths,
  type PropertyDef,
  type PropertyGroup,
} from './form/schema';

export type CopyCategory = 'material' | PropertyGroup | 'other' | 'rawYaml' | 'recipes';

interface CopyCategoryInfo {
  id: CopyCategory;
  /** Message key in the `schema` namespace */
  label: string;
  /** Message key in the `schema` namespace */
  description: string;
  defaultOn: boolean;
}

const category = (id: 'material' | 'other' | 'rawYaml' | 'recipes', defaultOn = true): CopyCategoryInfo => ({
  id,
  label: `copy.categories.${id}.label`,
  description: `copy.categories.${id}.description`,
  defaultOn,
});

export const COPY_CATEGORIES: CopyCategoryInfo[] = [
  category('material'),
  ...PROPERTY_GROUPS.map((g) => ({ ...g, defaultOn: true })),
  category('other'),
  category('rawYaml'),
  category('recipes', false),
];

/** Values that are never copied: they belong to the model and must be unique per item. */
const NEVER_COPIED_PROPERTIES = new Set(['Pack.custom_model_data']);

export interface ItemConfigClipboard {
  format: 'resourcepackbuilder-item-config';
  sourceItemId: string;
  sourceName: string;
  sourceNexoId: string;
  projectId: string;
  config: ConfigObject;
  armor?: ArmorSettings;
  rawYaml: string;
  /** Extra textures referenced by the config or armor settings (@asset:…) */
  assets: Record<string, ModelTexture>;
  recipes: Recipe[];
}

/** Plain-text name of the item the clipboard was copied from. */
export function clipboardLabel(clip: ItemConfigClipboard): string {
  return stripFormatting(clip.sourceName).trim() || clip.sourceNexoId;
}

export function copyItemConfig(item: Item, projectId: string): ItemConfigClipboard {
  return {
    format: 'resourcepackbuilder-item-config',
    sourceItemId: item.id,
    sourceName: item.displayName,
    sourceNexoId: item.nexoId,
    projectId,
    config: deepClone(item.config),
    ...(item.armor && { armor: deepClone(item.armor) }),
    rawYaml: item.rawYaml,
    assets: deepClone(item.assets ?? {}),
    recipes: deepClone(item.recipes ?? []),
  };
}

const copyableProperties = (group: PropertyGroup): PropertyDef[] =>
  PROPERTIES.filter((p) => p.group === group && !NEVER_COPIED_PROPERTIES.has(p.id));

/**
 * Config values of the "other" category: everything without a property (see unknownConfigPaths), top-level keys
 * first. Unknown keys under Pack (model, textures, parent_model …) belong to the model and stay with the target.
 */
function otherPaths(config: ConfigObject): string[][] {
  return unknownConfigPaths(config)
    .filter((path) => path[0] !== 'Pack' && !MANAGED_TOP_LEVEL_KEYS.includes(path[0]) && !NEVER_COPIED_PROPERTIES.has(path.join('.')))
    .sort((a, b) => a.length - b.length);
}

/**
 * One entry of a clipboard summary: literal text that is shown as is (material, YAML key, path),
 * or a message key in the `schema` namespace with optional ICU arguments.
 */
export type SummaryEntry = { text: string } | { key: string; params?: Record<string, string | number> };

export interface CategorySummary {
  id: CopyCategory;
  /** What the category contains (for display) */
  entries: SummaryEntry[];
}

/** What the clipboard contains per category. */
export function summarizeClipboard(clip: ItemConfigClipboard): CategorySummary[] {
  const config = clip.config;
  return COPY_CATEGORIES.map(({ id }) => {
    const text = (t: string): SummaryEntry => ({ text: t });
    let entries: SummaryEntry[];
    if (id === 'material') entries = typeof config.material === 'string' ? [text(config.material)] : [];
    else if (id === 'other') entries = otherPaths(config).map((p) => text(p.join('.')));
    else if (id === 'rawYaml')
      entries = clip.rawYaml.trim() ? [{ key: 'copy.rawYamlLines', params: { count: clip.rawYaml.trim().split('\n').length } }] : [];
    else if (id === 'recipes') entries = clip.recipes.map((r) => ({ key: getRecipeTypeInfo(r.type).label }));
    else
      entries = copyableProperties(id)
        .filter((p) => isPropertyActive(clip, p))
        .map((p) => ({ key: p.label }));
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
  const transferProperty = (def: PropertyDef) => {
    const value = getPropertyValue(clip, def);
    if (value !== undefined) setPropertyValue(target, def, deepClone(value));
    else if (mode === 'replace') setPropertyValue(target, def, undefined);
  };

  if (categories.has('material')) {
    if (typeof source.material === 'string') config.material = source.material;
    else if (mode === 'replace') delete config.material;
  }
  for (const group of PROPERTY_GROUPS) {
    if (!categories.has(group.id)) continue;
    for (const def of copyableProperties(group.id)) transferProperty(def);
  }
  if (categories.has('other')) {
    const paths = new Map<string, string[]>();
    for (const path of [...otherPaths(source), ...(mode === 'replace' ? otherPaths(config) : [])]) paths.set(path.join('.'), path);
    for (const path of paths.values()) transfer(path);
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

/** Takes over referenced extra textures and removes ones no longer used (also those only used in the extra YAML). */
function syncAssets(target: Item, clip: ItemConfigClipboard) {
  const referenced = referencedAssetIds(target);
  const isUsed = (id: string) => referenced.has(id) || target.rawYaml.includes(assetToken(id));
  target.assets = target.assets ?? {};
  for (const [id, asset] of Object.entries(clip.assets)) {
    if (isUsed(id) && !target.assets[id]) target.assets[id] = deepClone(asset);
  }
  for (const id of Object.keys(target.assets)) {
    if (!isUsed(id)) delete target.assets[id];
  }
}
