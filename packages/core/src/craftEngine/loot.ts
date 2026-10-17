/**
 * CraftEngine loot: the loot tables of blocks and furniture (`loot` at the root of their definition, edited on the
 * item's Loot tab) and the project's loot sources, which bind a loot table to a vanilla loot event. CraftEngine reads
 * loot sources from `loot_source(s)` (or the old `vanilla_loot(s)`), each under its id (AbstractLootManager); the
 * project keeps them as a list (`lootSources` of `Project.craftEngine`), each entry with its `id`, and the export
 * writes them to configuration/loot_sources.yml.
 */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { TypedListField } from '../form/fields';
import { pruneValue } from '../form/prune';
import type { ConfigObject, Project } from '../project/types';
import { craftEngineBlock } from './block';
import { craftEngineFurniture } from './furniture';
import { CE_LOOT_SOURCES } from './logic';

/** The property (and config path) of the block's and the furniture's loot in the editor */
export const CE_LOOT_PROPERTY_IDS = { block: 'block.loot', furniture: 'furniture.loot' } as const;

/** The loot properties an item can use: that of the block or of the furniture it places. */
export function lootPropertyIds(config: ConfigObject): string[] {
  if (craftEngineBlock(config)) return [CE_LOOT_PROPERTY_IDS.block];
  if (craftEngineFurniture(config)) return [CE_LOOT_PROPERTY_IDS.furniture];
  return [];
}

/** The project's loot sources as the editor edits them: a list of entries switched by `type`, each with its `id`. */
export const CE_LOOT_SOURCE_LIST: TypedListField = {
  type: 'typedList',
  key: 'loot_sources',
  label: 'lootSources.label',
  catalog: 'lootSources',
  types: () => CE_LOOT_SOURCES,
};

/** The id a loot source is written under: as written, in the project's namespace when it names none. */
export function lootSourceKey(project: Pick<Project, 'namespace'>, id: string): string {
  const trimmed = id.trim();
  return trimmed.includes(':') ? trimmed : formatResourceLocation(project.namespace, trimmed);
}

/** The project's loot sources (an empty list for a project without any). */
export const projectLootSources = (project: Project): ConfigObject[] => project.craftEngine?.lootSources ?? [];

/**
 * The `loot_sources` section: each loot source with an id under its key, pruned by the catalog's fields and without
 * its `id`. Sources without an id are left out (the export reports them), as is a later source with a taken key.
 */
export function craftEngineLootSources(project: Project): Record<string, ConfigObject> {
  const section: Record<string, ConfigObject> = {};
  for (const source of projectLootSources(project)) {
    if (typeof source.id !== 'string' || !source.id.trim()) continue;
    const key = lootSourceKey(project, source.id);
    if (key in section) continue;
    const pruned = pruneValue([source], CE_LOOT_SOURCE_LIST);
    const entry = Array.isArray(pruned) && isPlainObject(pruned[0]) ? pruned[0] : null;
    if (!entry) continue;
    const rest = { ...entry };
    delete rest.id;
    section[key] = rest as ConfigObject;
  }
  return section;
}
