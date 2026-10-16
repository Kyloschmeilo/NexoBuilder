/**
 * Repairs contradicting structure lists of a project (after syncing single entries, or in stored
 * data of any origin). `item.folderId` and `folder.parentId` are authoritative; the order lists
 * are completed or cleaned up from them. Only what is wrong is changed, so unchanged parts stay
 * the same objects in an Immer draft.
 */
import { MEDIA_KIND_LIST, mediaList, setMediaList } from '../nexo/media/kinds';
import { sameList } from '../object';
import type { Item, Project } from './types';

/** Folder for items whose folder no longer exists (e.g. deleted by someone else while they were being created). */
export const RECOVERY_FOLDER_ID = 'f_recovered';
const RECOVERY_FOLDER_NAME = 'Recovered';

/** Keeps the known order, removes invalid/duplicate entries and appends missing ones. */
function mergeOrder(current: string[], actual: string[]): string[] {
  const valid = new Set(actual);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of current) {
    if (valid.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  for (const id of actual) if (!seen.has(id)) result.push(id);
  return result;
}

function byCreatedThenId(items: Record<string, Item>) {
  return (a: string, b: string) => items[a].createdAt - items[b].createdAt || (a < b ? -1 : a > b ? 1 : 0);
}

function withoutDuplicateIds<T extends { id: string }>(list: T[]): T[] {
  if (new Set(list.map((e) => e.id)).size === list.length) return list;
  const seen = new Set<string>();
  return list.filter((entry) => !seen.has(entry.id) && seen.add(entry.id));
}

/** Pushes `value` to the list at `key` of `map`. */
function addTo(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** Repairs the folder tree and removes duplicate glyphs, sounds and paintings (mutates – for Immer drafts). */
export function repairProject(project: Project): void {
  const folders = project.folders;
  const items = project.items;
  const folderIds = Object.keys(folders).sort();

  // Folders whose parent folder is missing move to the top level
  for (const id of folderIds) {
    const folder = folders[id];
    if (folder.parentId !== null && (!folders[folder.parentId] || folder.parentId === id)) folder.parentId = null;
  }
  // Resolve cycles (A in B, B in A – moved at the same time)
  for (;;) {
    const reachable = new Set<string>();
    const queue = folderIds.filter((id) => folders[id].parentId === null);
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const child of folderIds) if (folders[child].parentId === id) queue.push(child);
    }
    const lost = folderIds.find((id) => !reachable.has(id));
    if (!lost) break;
    folders[lost].parentId = null;
  }

  const roots = folderIds.filter((id) => folders[id].parentId === null);
  const rootOrder = mergeOrder(project.rootFolderIds, roots);

  // Rescue items without a folder
  const orphans = Object.keys(items).filter((id) => !folders[items[id].folderId]);
  if (orphans.length) {
    let target = rootOrder[0];
    if (!target) {
      folders[RECOVERY_FOLDER_ID] = { id: RECOVERY_FOLDER_ID, name: RECOVERY_FOLDER_NAME, parentId: null, folderIds: [], itemIds: [] };
      target = RECOVERY_FOLDER_ID;
      rootOrder.push(RECOVERY_FOLDER_ID);
      folderIds.push(RECOVERY_FOLDER_ID);
    }
    for (const id of orphans) items[id].folderId = target;
  }
  if (!sameList(project.rootFolderIds, rootOrder)) project.rootFolderIds = rootOrder;

  const children = new Map<string, string[]>();
  const folderItems = new Map<string, string[]>();
  for (const id of folderIds) {
    const parent = folders[id].parentId;
    if (parent) addTo(children, parent, id);
  }
  for (const id of Object.keys(items).sort(byCreatedThenId(items))) addTo(folderItems, items[id].folderId, id);
  for (const id of folderIds) {
    const folder = folders[id];
    const nextFolders = mergeOrder(folder.folderIds, children.get(id) ?? []);
    if (!sameList(folder.folderIds, nextFolders)) folder.folderIds = nextFolders;
    const nextItems = mergeOrder(folder.itemIds, folderItems.get(id) ?? []);
    if (!sameList(folder.itemIds, nextItems)) folder.itemIds = nextItems;
  }

  // Remove duplicate glyphs, sounds, paintings (same internal ID)
  for (const kind of MEDIA_KIND_LIST) {
    const list = mediaList(project, kind);
    const unique = withoutDuplicateIds(list);
    if (unique !== list) setMediaList(project, kind, unique);
  }
}
