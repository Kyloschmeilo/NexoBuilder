/**
 * The project's own lists of CraftEngine entries (categories, worldgen features, atlases, config factories): each
 * entry carries its `id`, and the export writes it under its key, a resource location in the project's namespace
 * when the id names none. These helpers find the key of each entry and build a section from a list.
 */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ObjectListField } from '../form/fields';
import { pruneValue } from '../form/prune';
import type { ConfigObject, Project } from '../project/types';

/** Ids an entry can have: a resource location, its namespace optional */
export const CE_ENTRY_ID = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

/** The id of an entry ('' without one). */
export const projectEntryId = (entry: ConfigObject): string => (typeof entry.id === 'string' ? entry.id.trim() : '');

/** The key an entry is written under: its id as written, in the project's namespace when it names none. */
export function projectEntryKey(project: Pick<Project, 'namespace'>, id: string): string {
  const trimmed = id.trim();
  return trimmed.includes(':') ? trimmed : formatResourceLocation(project.namespace, trimmed);
}

/** The entries with an id, each under its key (a later entry with a taken key is left out). */
export function keyedEntries(project: Pick<Project, 'namespace'>, entries: readonly ConfigObject[]): Map<string, ConfigObject> {
  const result = new Map<string, ConfigObject>();
  for (const entry of entries) {
    const id = projectEntryId(entry);
    if (!id) continue;
    const key = projectEntryKey(project, id);
    if (!result.has(key)) result.set(key, entry);
  }
  return result;
}

/** An entry pruned by the fields of its list, without its `id` (null when nothing is left of it). */
export function prunedEntry(entry: ConfigObject, list: ObjectListField): ConfigObject | null {
  const pruned = pruneValue([entry], list);
  if (!Array.isArray(pruned) || !isPlainObject(pruned[0])) return null;
  const result = { ...(pruned[0] as ConfigObject) };
  delete result.id;
  return result;
}

/** A section of the entries with an id: each pruned under its key, then passed through `finish` if given. */
export function entrySection(
  project: Pick<Project, 'namespace'>,
  entries: readonly ConfigObject[],
  list: ObjectListField,
  finish: (entry: ConfigObject) => ConfigObject = (entry) => entry,
): Record<string, ConfigObject> {
  const section: Record<string, ConfigObject> = {};
  for (const [key, entry] of keyedEntries(project, entries)) {
    const pruned = prunedEntry(entry, list);
    if (pruned) section[key] = finish(pruned);
  }
  return section;
}
