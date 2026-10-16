/**
 * Applies changes from the shared folder to a project and then repairs the folder structure.
 *
 * Because each entry is synced individually, lists can contradict each other – e.g. when two people
 * put an item into the same folder at the same time. Therefore `item.folderId` and `folder.parentId`
 * are always authoritative; the order lists are completed or cleaned up from them.
 */
import { produce, type Draft } from 'immer';
import type { Item, Project } from '../project/types';
import { MEDIA_KIND_LIST, MEDIA_KINDS, mediaList, setMediaList, type MediaEntry, type MediaKind } from '../nexo/media/kinds';
import type { Envelope, ProjectMeta } from './format';

/** Folder for items whose folder was deleted by someone else while they were being created. */
export const RECOVERY_FOLDER_ID = 'f_recovered';
const RECOVERY_FOLDER_NAME = 'Recovered';

type ListUpdate = <T extends { id: string }>(list: T[], kind: MediaKind) => T[];

/** Replaces each project list (glyphs, sounds, paintings) by `update(list)` if that returns a new array. */
function updateLists(draft: Draft<Project>, update: ListUpdate): void {
  for (const kind of MEDIA_KIND_LIST) {
    const list = mediaList(draft as Project, kind);
    const next = update(list, kind);
    if (next !== list) setMediaList(draft as Project, kind, next);
  }
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

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

/** Repairs the folder structure of an (Immer) project. Only changes what is wrong. */
function normalizeTree(draft: Draft<Project>): void {
  const folders = draft.folders;
  const items = draft.items;
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
  const rootOrder = mergeOrder(draft.rootFolderIds, roots);

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
  if (!sameList(draft.rootFolderIds, rootOrder)) draft.rootFolderIds = rootOrder;

  const children = new Map<string, string[]>();
  const folderItems = new Map<string, string[]>();
  for (const id of folderIds) {
    const parent = folders[id].parentId;
    if (parent) children.set(parent, [...(children.get(parent) ?? []), id]);
  }
  for (const id of Object.keys(items).sort(byCreatedThenId(items))) {
    const folderId = items[id].folderId;
    folderItems.set(folderId, [...(folderItems.get(folderId) ?? []), id]);
  }
  for (const id of folderIds) {
    const folder = folders[id];
    const nextFolders = mergeOrder(folder.folderIds, children.get(id) ?? []);
    if (!sameList(folder.folderIds, nextFolders)) folder.folderIds = nextFolders;
    const nextItems = mergeOrder(folder.itemIds, folderItems.get(id) ?? []);
    if (!sameList(folder.itemIds, nextItems)) folder.itemIds = nextItems;
  }

  // Remove duplicate glyphs, sounds, paintings (same internal ID)
  updateLists(draft, withoutDuplicateIds);
}

/** Inserts, replaces or removes (data undefined) the entry with the ID in the list. */
function upsert<T extends { id: string }>(list: T[], id: string, data: T | undefined): void {
  const index = list.findIndex((entry) => entry.id === id);
  if (!data) {
    if (index >= 0) list.splice(index, 1);
  } else if (index >= 0) list[index] = data;
  else list.push(data);
}

/**
 * Applies changes from the folder. Returns a new project; unchanged parts remain
 * the same objects (important for undo/redo and change detection).
 */
export function applyRemoteEntities(project: Project, envelopes: Envelope[], now: number): Project {
  const orders: Partial<Record<MediaKind, string[]>> = {};
  const overlaid = produce(project, (draft) => {
    for (const env of envelopes) {
      switch (env.kind) {
        case 'project':
          if (env.data && !env.deleted) applyMeta(draft, env.data, orders);
          break;
        case 'folder':
          if (env.data && !env.deleted) draft.folders[env.id] = env.data;
          else delete draft.folders[env.id];
          break;
        case 'item':
          if (env.data && !env.deleted) draft.items[env.id] = env.data;
          else delete draft.items[env.id];
          break;
        default:
          upsert<MediaEntry>(mediaList(draft as Project, env.kind), env.id, env.deleted ? undefined : env.data);
          break;
      }
    }
  });
  // Second pass: applied objects are now part of the project and may be adjusted
  return produce(overlaid, (draft) => {
    updateLists(draft, (list, kind) => sortByOrder(list, orders[kind]));
    normalizeTree(draft);
    draft.updatedAt = Math.max(draft.updatedAt, now);
  });
}

function applyMeta(draft: Draft<Project>, meta: ProjectMeta, orders: Partial<Record<MediaKind, string[]>>): void {
  draft.name = meta.name;
  draft.namespace = meta.namespace;
  draft.settings = meta.settings;
  draft.rootFolderIds = [...meta.rootFolderIds];
  if (typeof meta.createdAt === 'number') draft.createdAt = meta.createdAt;
  for (const kind of MEDIA_KIND_LIST) {
    const order = meta[MEDIA_KINDS[kind].orderField];
    if (Array.isArray(order)) orders[kind] = order;
  }
}

/** The list sorted by `order` (unknown IDs last); the same array if nothing moves. */
function sortByOrder<T extends { id: string }>(list: T[], order: string[] | undefined): T[] {
  if (!order) return list;
  const position = new Map(order.map((id, i) => [id, i]));
  const rank = (entry: T) => position.get(entry.id) ?? Number.MAX_SAFE_INTEGER;
  const sorted = [...list].sort((a, b) => rank(a) - rank(b));
  return sorted.some((entry, i) => entry !== list[i]) ? sorted : list;
}

/** Builds a project entirely from the files of a shared folder. */
export function projectFromEnvelopes(meta: ProjectMeta, envelopes: Envelope[], now: number): Project {
  const base: Project = {
    formatVersion: 1,
    id: meta.id,
    name: meta.name,
    namespace: meta.namespace,
    settings: meta.settings,
    folders: {},
    items: {},
    rootFolderIds: [...meta.rootFolderIds],
    glyphs: [],
    sounds: [],
    paintings: [],
    createdAt: typeof meta.createdAt === 'number' ? meta.createdAt : now,
    updatedAt: now,
  };
  return applyRemoteEntities(base, envelopes, now);
}
