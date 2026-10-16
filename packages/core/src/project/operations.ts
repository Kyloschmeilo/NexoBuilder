/**
 * Changes to the folder tree and the items of a project. All functions mutate the project (for Immer
 * drafts or tests) and leave it untouched when the change is not possible.
 */
import { current, isDraft } from 'immer';
import { deepClone, uid } from '@resourcepackbuilder/utils';
import { createFolder, createItem, insertFolder, insertItem, type NewItemInput } from './factory';
import { uniqueItemId } from './ids';
import { getDescendantFolderIds } from './tree';
import type { Item, Project } from './types';

/** Inserts `id` into `list` before `beforeId`, or at the end when `beforeId` is missing or not in the list. */
function insertBefore(list: string[], id: string, beforeId: string | undefined): void {
  const index = beforeId ? list.indexOf(beforeId) : -1;
  if (index >= 0) list.splice(index, 0, id);
  else list.push(id);
}

/* ------------------------------------------------------------------ folders */

/** Takes `folderId` out of its parent's (or the top-level) folder list. */
function detachFolder(project: Project, folderId: string): void {
  const folder = project.folders[folderId];
  if (!folder) return;
  const parent = folder.parentId ? project.folders[folder.parentId] : undefined;
  if (parent) parent.folderIds = parent.folderIds.filter((id) => id !== folderId);
  else project.rootFolderIds = project.rootFolderIds.filter((id) => id !== folderId);
}

/** Renames a folder; blank names are ignored. Returns whether the name was set. */
export function renameFolder(project: Project, folderId: string, name: string): boolean {
  const folder = project.folders[folderId];
  const trimmed = name.trim();
  if (!folder || !trimmed) return false;
  folder.name = trimmed;
  return true;
}

/** Deletes a folder with its subfolders and their items. */
export function deleteFolder(project: Project, folderId: string): void {
  const ids = getDescendantFolderIds(project, folderId);
  for (const id of ids) {
    for (const itemId of project.folders[id]?.itemIds ?? []) delete project.items[itemId];
  }
  detachFolder(project, folderId);
  for (const id of ids) delete project.folders[id];
}

/** Whether `folderId` may move into `newParentId` (top level: `null`) without creating a cycle. */
export function canMoveFolder(project: Project, folderId: string, newParentId: string | null): boolean {
  if (!project.folders[folderId]) return false;
  if (newParentId === null) return true;
  return Boolean(project.folders[newParentId]) && !getDescendantFolderIds(project, folderId).includes(newParentId);
}

/**
 * Moves a folder into another folder (or to the top level), optionally before a sibling. Returns `false`
 * (and changes nothing) when the folder would end up inside itself.
 */
export function moveFolder(project: Project, folderId: string, newParentId: string | null, beforeFolderId?: string): boolean {
  if (!canMoveFolder(project, folderId, newParentId)) return false;
  // Detach first: it replaces the parent's list
  detachFolder(project, folderId);
  project.folders[folderId].parentId = newParentId;
  const list = newParentId === null ? project.rootFolderIds : project.folders[newParentId].folderIds;
  insertBefore(list, folderId, beforeFolderId);
  return true;
}

/** The first top-level folder, created with `name` when the project has none. */
export function firstRootFolder(project: Project, name: string): string {
  const existing = project.rootFolderIds.find((id) => project.folders[id]);
  if (existing) return existing;
  const folder = createFolder(name, null);
  insertFolder(project, folder);
  return folder.id;
}

/* ------------------------------------------------------------------ items */

/** Adds a new item with a unique item ID; `configure` runs before it is inserted. */
export function insertNewItem(project: Project, input: NewItemInput, configure?: (item: Item) => void): Item {
  const item = createItem(input);
  item.itemId = uniqueItemId(project, item.itemId);
  configure?.(item);
  insertItem(project, item);
  return item;
}

export function deleteItem(project: Project, itemId: string): void {
  const item = project.items[itemId];
  if (!item) return;
  const folder = project.folders[item.folderId];
  if (folder) folder.itemIds = folder.itemIds.filter((id) => id !== itemId);
  delete project.items[itemId];
}

/** Moves an item into a folder, optionally before another item. Returns whether both exist. */
export function moveItem(project: Project, itemId: string, folderId: string, beforeItemId?: string): boolean {
  const item = project.items[itemId];
  const target = project.folders[folderId];
  if (!item || !target) return false;
  const source = project.folders[item.folderId];
  if (source) source.itemIds = source.itemIds.filter((id) => id !== itemId);
  item.folderId = folderId;
  insertBefore(target.itemIds, itemId, beforeItemId);
  return true;
}

/**
 * Copies an item right after the original. The copy gets new internal IDs (item and recipes), a unique
 * item ID based on "<original>_copy" and `displayName`.
 */
export function duplicateItem(project: Project, itemId: string, displayName: string): Item | null {
  const entry = project.items[itemId];
  if (!entry) return null;
  // structuredClone cannot copy Immer drafts
  const original = isDraft(entry) ? current(entry) : entry;
  const now = Date.now();
  const copy: Item = {
    ...deepClone(original),
    id: uid('i_'),
    displayName,
    recipes: original.recipes.map((recipe) => ({ ...deepClone(recipe), id: uid('r_') })),
    createdAt: now,
    updatedAt: now,
  };
  copy.itemId = uniqueItemId(project, `${original.itemId}_copy`);
  project.items[copy.id] = copy;
  const folder = project.folders[copy.folderId];
  if (folder) folder.itemIds.splice(folder.itemIds.indexOf(itemId) + 1, 0, copy.id);
  return copy;
}
