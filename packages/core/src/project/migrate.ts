/**
 * Brings stored projects (IndexedDB, project files, shared folders) of any earlier version into
 * the current shape. Stored data is untrusted: it goes through the lenient schemas of schema.ts
 * (which also run the migrations) – invalid fields get defaults, invalid entries are dropped.
 * Afterwards the folder tree is repaired (see repair.ts): references to missing folders and items are
 * removed, items without a folder are rescued.
 */
import { CoreError, isPlainObject } from '@resourcepackbuilder/utils';
import { repairProject } from './repair';
import { parseItem, projectSchema } from './schema';
import type { Item, Project } from './types';

export function migrateProject(raw: unknown, now = Date.now()): Project {
  if (!isPlainObject(raw)) throw new CoreError('project.invalid');
  const parsed = projectSchema(now).safeParse(raw);
  if (!parsed.success) throw new CoreError('project.noName');
  const project = parsed.data;
  repairProject(project);
  return project;
}

/** Migrates one stored item (also used for items received from a shared folder); null when it is no item. */
export function migrateItem(raw: unknown, now = Date.now(), fallbackId?: string): Item | null {
  return parseItem(raw, now, fallbackId);
}
