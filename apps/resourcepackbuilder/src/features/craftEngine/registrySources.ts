/**
 * The CraftEngine project registries as entry sources: every list (loot sources, templates, categories …) and map
 * (global variables, lang locales …) of `project.craftEngine` that the Logic panel lists entry by entry. An entry's
 * key is `<source id>/<index>` for a list and `<source id>/<map key>` for a map; the operations below are pure and
 * return the source's next value, which the page writes back with the source's `write` command.
 */
import {
  type AttributePart,
  CE_ATLAS_LIST,
  CE_ATTRIBUTE_LISTS,
  CE_CATEGORY_LIST,
  CE_CONFIG_FACTORY_LIST,
  CE_CONFIGURED_FEATURE_LIST,
  CE_GLOBAL_VARIABLE_MAP,
  CE_LANG_MAP,
  CE_LOOT_SOURCE_LIST,
  CE_PLACED_FEATURE_LIST,
  CE_SCRIPT_LIST,
  CE_TEMPLATE_LIST,
  CE_TRANSLATION_MAP,
  newConfiguredFeature,
  projectAtlases,
  projectAttributeEntries,
  projectCategories,
  projectConfigFactories,
  projectConfiguredFeatures,
  projectGlobalVariables,
  projectLang,
  projectLootSources,
  projectPlacedFeatures,
  projectScripts,
  projectServerTranslations,
  projectTemplates,
} from '@resourcepackbuilder/core/craftEngine';
import type { MapField, ObjectListField, TypedListField } from '@resourcepackbuilder/core/form';
import type { Project } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import {
  setAttributeEntries,
  setCraftEngineList,
  setGlobalVariables,
  setLang,
  setLootSources,
  setServerTranslations,
  setTemplates,
} from '../../commands/craftEngine';
import type { RegistryGroup } from '../../shell/sidebar/panels/registry';
import type { ViewName } from '../../store/ui';

/** A list of entries: objects edited with the list field's entry fields (or, for a typed list, by their type). */
export interface ListSource {
  kind: 'list';
  id: string;
  field: ObjectListField | TypedListField;
  read: (project: Project) => unknown[];
  write: (value: unknown[]) => void;
  /** A new entry for `project`, when it depends on the project (otherwise the field's template) */
  newEntry?: (project: Project) => Record<string, unknown>;
}

/** A map of entries: each key is an entry, edited with the map field's value field. */
export interface MapSource {
  kind: 'map';
  id: string;
  field: MapField;
  read: (project: Project) => Record<string, unknown>;
  write: (value: Record<string, unknown>) => void;
}

export type EntrySource = ListSource | MapSource;

/** The views of the Logic panel whose page lists entries. */
export type CraftEngineRegistryView = Extract<
  ViewName,
  | 'lootSources'
  | 'templates'
  | 'globalVariables'
  | 'attributes'
  | 'translations'
  | 'categories'
  | 'worldgen'
  | 'atlases'
  | 'pack'
  | 'scripts'
>;

const list = (
  id: string,
  field: ObjectListField | TypedListField,
  read: (project: Project) => unknown[],
  write: (value: unknown[]) => void,
  newEntry?: (project: Project) => Record<string, unknown>,
): ListSource => ({ kind: 'list', id, field, read, write, ...(newEntry && { newEntry }) });

const attributeList = (part: AttributePart): ListSource =>
  list(
    part,
    CE_ATTRIBUTE_LISTS[part],
    (project) => projectAttributeEntries(project, part),
    (value) => setAttributeEntries(part, value),
  );

/** The entry sources of each CraftEngine registry view, in page and panel order. */
export const CRAFT_ENGINE_SOURCES: Record<CraftEngineRegistryView, readonly EntrySource[]> = {
  lootSources: [list('lootSources', CE_LOOT_SOURCE_LIST, projectLootSources, setLootSources)],
  templates: [list('templates', CE_TEMPLATE_LIST, projectTemplates, setTemplates)],
  globalVariables: [
    { kind: 'map', id: 'globalVariables', field: CE_GLOBAL_VARIABLE_MAP, read: projectGlobalVariables, write: setGlobalVariables },
  ],
  attributes: [attributeList('definitions'), attributeList('operations'), attributeList('equipmentSets'), attributeList('damageRules')],
  translations: [
    { kind: 'map', id: 'lang', field: CE_LANG_MAP, read: projectLang, write: setLang },
    { kind: 'map', id: 'server', field: CE_TRANSLATION_MAP, read: projectServerTranslations, write: setServerTranslations },
  ],
  categories: [list('categories', CE_CATEGORY_LIST, projectCategories, (value) => setCraftEngineList('categories', value))],
  worldgen: [
    list(
      'configuredFeatures',
      CE_CONFIGURED_FEATURE_LIST,
      projectConfiguredFeatures,
      (value) => setCraftEngineList('configuredFeatures', value),
      // Minecraft 26.3 changed how a feature names block states
      (project) => newConfiguredFeature(project.settings.minecraftVersion),
    ),
    list('placedFeatures', CE_PLACED_FEATURE_LIST, projectPlacedFeatures, (value) => setCraftEngineList('placedFeatures', value)),
  ],
  atlases: [list('atlases', CE_ATLAS_LIST, projectAtlases, (value) => setCraftEngineList('atlases', value))],
  pack: [list('configFactories', CE_CONFIG_FACTORY_LIST, projectConfigFactories, (value) => setCraftEngineList('configFactories', value))],
  scripts: [list('scripts', CE_SCRIPT_LIST, projectScripts, (value) => setCraftEngineList('scripts', value))],
};

/** The parts of an entry key: the source id and the index (list) or map key. */
export function parseEntryKey(key: string): { source: string; rest: string } | null {
  const slash = key.indexOf('/');
  if (slash <= 0) return null;
  return { source: key.slice(0, slash), rest: key.slice(slash + 1) };
}

/** The key of a list entry or map entry of `source`. */
export const entryKey = (source: EntrySource, indexOrKey: number | string): string => `${source.id}/${indexOrKey}`;

/** A list entry with its index, or a map entry with its key, and its current value. */
export type ResolvedEntry =
  { kind: 'list'; source: ListSource; index: number; value: unknown } | { kind: 'map'; source: MapSource; key: string; value: unknown };

/** The source `key` points into, with the entry's index (list) or map key, when it exists in `project`. */
export function resolveEntry(sources: readonly EntrySource[], project: Project, key: string | undefined): ResolvedEntry | null {
  if (key === undefined) return null;
  const parts = parseEntryKey(key);
  const source = parts && sources.find((candidate) => candidate.id === parts.source);
  if (!parts || !source) return null;
  if (source.kind === 'list') {
    if (!/^\d+$/.test(parts.rest)) return null;
    const index = Number(parts.rest);
    const entries = source.read(project);
    return index < entries.length ? { kind: 'list', source, index, value: entries[index] } : null;
  }
  const map = source.read(project);
  return Object.hasOwn(map, parts.rest) ? { kind: 'map', source, key: parts.rest, value: map[parts.rest] } : null;
}

/** The label of a list entry: its title field (or `id`, `path`, `name`), '' without one. */
export function listEntryLabel(field: ObjectListField | TypedListField, entry: unknown): string {
  if (!isPlainObject(entry)) return '';
  const titleKey = field.type === 'objectList' ? field.titleKey : undefined;
  for (const key of [titleKey, 'id', 'path', 'name']) {
    const value = key ? entry[key] : undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** A one-line fact about an entry: the type of a typed entry, the size of a map value, or a short text value. */
function entryDetail(source: EntrySource, value: unknown): string | undefined {
  if (source.kind === 'list') {
    if (source.field.type === 'typedList' && isPlainObject(value) && typeof value.type === 'string') return value.type;
    return undefined;
  }
  if (isPlainObject(value)) return String(Object.keys(value).length);
  if (typeof value === 'string') return value.length > 40 ? `${value.slice(0, 39)}…` : value;
  return undefined;
}

/** The panel groups of a registry: one per source, its entries in stored order. */
export function sourceGroups(sources: readonly EntrySource[], project: Project): RegistryGroup[] {
  return sources.map((source) => ({
    id: source.id,
    entries:
      source.kind === 'list'
        ? source.read(project).map((entry, index) => ({
            key: entryKey(source, index),
            label: listEntryLabel(source.field, entry),
            detail: entryDetail(source, entry),
          }))
        : Object.entries(source.read(project)).map(([mapKey, value]) => ({
            key: entryKey(source, mapKey),
            label: mapKey,
            detail: entryDetail(source, value),
          })),
  }));
}

/**
 * A new, empty entry of a list source for `project`: the source's own entry, the field's template, or an empty object
 * (a typed entry then picks its type).
 */
export function newListEntry(source: ListSource, project: Project): Record<string, unknown> {
  if (source.newEntry) return source.newEntry(project);
  return source.field.type === 'objectList' ? (source.field.newItem?.() ?? {}) : {};
}

/** The empty value of a new map entry. */
export function newMapValue(source: MapSource): unknown {
  return source.field.newValue?.() ?? (source.field.value.type === 'object' || source.field.value.type === 'map' ? {} : '');
}

/** Why `key` cannot name a new or renamed map entry ('empty', 'taken'), or null when it can. */
export function mapKeyProblem(map: Record<string, unknown>, key: string, current?: string): 'empty' | 'taken' | null {
  const trimmed = key.trim();
  if (!trimmed) return 'empty';
  if (trimmed !== current && Object.hasOwn(map, trimmed)) return 'taken';
  return null;
}

/** `list` with `entry` at `index`. */
export function withListEntry(list: readonly unknown[], index: number, entry: unknown): unknown[] {
  return list.map((current, i) => (i === index ? entry : current));
}

/** `list` without the entry at `index`. */
export function withoutListEntry(list: readonly unknown[], index: number): unknown[] {
  return list.filter((_, i) => i !== index);
}

/** `list` with a copy of the entry at `index` inserted after it. */
export function withDuplicate(list: readonly unknown[], index: number): unknown[] {
  if (index < 0 || index >= list.length) return [...list];
  return [...list.slice(0, index + 1), structuredClone(list[index]), ...list.slice(index + 1)];
}

/** `list` with the entry at `from` moved to `to` (clamped to the list). */
export function withMovedEntry(list: readonly unknown[], from: number, to: number): unknown[] {
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (from === target || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(target, 0, entry);
  return next;
}

/** `map` with the entry `from` renamed to `to`, keeping its position. */
export function withRenamedKey(map: Record<string, unknown>, from: string, to: string): Record<string, unknown> {
  if (from === to || !Object.hasOwn(map, from)) return { ...map };
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key === from ? to : key, value]));
}

/** `map` without `key`. */
export function withoutKey(map: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(map).filter(([current]) => current !== key));
}

/**
 * Where the list entry shown at `index` of `previous` is in `next` after a change from elsewhere (undo, redo): its new
 * index when it moved (entries are compared by content), null when it is gone and the slot now holds a neighbour, or
 * `index` when it stays (also when it was edited).
 */
export function followListEntry(previous: readonly unknown[], next: readonly unknown[], index: number): number | null {
  const text = (value: unknown) => JSON.stringify(value);
  const shown = text(previous[index]);
  if (index < next.length && text(next[index]) === shown) return index;
  const moved = next.findIndex((entry) => text(entry) === shown);
  if (moved >= 0) return moved;
  const previousTexts = new Set(previous.map(text));
  return index < next.length && previousTexts.has(text(next[index])) ? null : index;
}
