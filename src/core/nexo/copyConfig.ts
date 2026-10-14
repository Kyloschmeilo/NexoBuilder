/**
 * Eigenschaften eines Items auf andere Items übertragen – alles außer dem, was ein Item
 * ausmacht: Anzeigename, Item-ID, Modell (inkl. Varianten), Ordner und Modell-Daten
 * wie custom_model_data.
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
  { id: 'rawYaml', label: 'Zusätzliches YAML', description: 'Der Inhalt des YAML-Tabs', defaultOn: true },
  {
    id: 'recipes',
    label: 'Rezepte',
    description: 'Crafting-Rezepte – Achtung: gleiche Rezepte für mehrere Items stören sich im Spiel',
    defaultOn: false,
  },
];

/** Werte, die nie kopiert werden: sie gehören zum Modell und müssen pro Item eindeutig sein. */
export const NEVER_COPIED_PROPERTIES = new Set(['Pack.custom_model_data']);

export interface ItemConfigClipboard {
  format: 'nexobuilder-item-config';
  sourceItemId: string;
  sourceName: string;
  sourceNexoId: string;
  projectId: string;
  config: ConfigObject;
  rawYaml: string;
  /** Zusatz-Texturen, auf die die Konfiguration verweist (@asset:…) */
  assets: Record<string, ModelTexture>;
  recipes: Recipe[];
}

export function copyItemConfig(item: Item, projectId: string): ItemConfigClipboard {
  return {
    format: 'nexobuilder-item-config',
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

/** Oberste Schlüssel, die zu keiner Eigenschaft gehören (z.B. aus importierten Configs) */
function otherKeys(config: ConfigObject): string[] {
  const roots = new Set(PROPERTIES.map((p) => p.path[0]));
  return Object.keys(config).filter((k) => !roots.has(k) && !MANAGED_TOP_LEVEL_KEYS.includes(k));
}

/**
 * Unbekannte Unterschlüssel in Components/Mechanics (die keine eigene Eigenschaft haben).
 * Unbekanntes unter Pack (model, textures, parent_model …) gehört zum Modell und bleibt beim Ziel.
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
  /** Namen der enthaltenen Eigenschaften (für die Anzeige) */
  entries: string[];
}

/** Was in der Zwischenablage je Kategorie enthalten ist. */
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
   * replace: Das Ziel bekommt in den gewählten Kategorien genau die Werte der Quelle
   *          (Eigenschaften, die es nur im Ziel gibt, werden entfernt).
   * merge:   Nur hinzufügen bzw. überschreiben, was die Quelle hat.
   */
  mode: 'replace' | 'merge';
}

/**
 * Überträgt die gewählten Kategorien auf ein Item (verändert `target`, z.B. in einem Immer-Draft).
 * `project` wird für eindeutige Block-Variationen gebraucht.
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

/** Eigene Blöcke brauchen pro Typ eine eigene Variation – sonst wäre es derselbe Block. */
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

/** Übernimmt referenzierte Zusatz-Texturen und entfernt nicht mehr benutzte. */
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
