/** CraftEngine's configuration files: top-level sections (`items:`, `blocks:` …) holding entries by their key. */
import type { Item, Project } from '../project/types';
import { toYaml, yamlHeader } from '../yaml';

/** The sections of one configuration file; each maps an entry's key (namespace:id) to its config. */
export interface CraftEngineSections {
  items?: Record<string, Record<string, unknown>>;
  blocks?: Record<string, Record<string, unknown>>;
  furniture?: Record<string, Record<string, unknown>>;
  recipes?: Record<string, Record<string, unknown>>;
  images?: Record<string, Record<string, unknown>>;
  emoji?: Record<string, Record<string, unknown>>;
  sounds?: Record<string, Record<string, unknown>>;
  jukebox_songs?: Record<string, Record<string, unknown>>;
  paintings?: Record<string, Record<string, unknown>>;
  equipments?: Record<string, Record<string, unknown>>;
  categories?: Record<string, Record<string, unknown>>;
  /** Locale → lang key → text */
  lang?: Record<string, Record<string, unknown>>;
  loot_sources?: Record<string, Record<string, unknown>>;
  /** Template id → body (any config value) */
  templates?: Record<string, unknown>;
  /** Variable name → MiniMessage text */
  global_variables?: Record<string, unknown>;
  attributes?: Record<string, Record<string, unknown>>;
  attribute_operations?: Record<string, Record<string, unknown>>;
  equipment_sets?: Record<string, Record<string, unknown>>;
  /** Damage type → list of rules */
  damage_rules?: Record<string, unknown>;
}

const SECTION_ORDER: Array<keyof CraftEngineSections> = [
  'items',
  'blocks',
  'furniture',
  'recipes',
  'images',
  'emoji',
  'sounds',
  'jukebox_songs',
  'paintings',
  'equipments',
  'categories',
  'lang',
  'loot_sources',
  'templates',
  'global_variables',
  'attribute_operations',
  'attributes',
  'equipment_sets',
  'damage_rules',
];

/** Writes the non-empty sections, separated by a blank line, with an optional header comment. */
export function sectionsToYaml(sections: CraftEngineSections, description?: string): string {
  const body = SECTION_ORDER.flatMap((key) => {
    const entries = sections[key];
    return entries && Object.keys(entries).length > 0 ? [toYaml({ [key]: entries }).trimEnd()] : [];
  }).join('\n\n');
  const text = body ? body + '\n' : '';
  return description ? yamlHeader(description) + text : text;
}

/** The key of an item under `items:`, e.g. "ruby:ruby_sword". */
export function craftEngineItemKey(project: Pick<Project, 'namespace'>, item: Pick<Item, 'itemId'>): string {
  return `${project.namespace}:${item.itemId}`;
}

/** Copies the keys of `source` in the given order first, the others after them. */
export function ordered(source: Record<string, unknown>, order: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of order) if (source[key] !== undefined) result[key] = source[key];
  for (const [key, value] of Object.entries(source)) if (result[key] === undefined) result[key] = value;
  return result;
}
