/**
 * Applies changes from the shared folder to a project and then repairs the folder structure.
 *
 * Because each entry is synced individually, lists can contradict each other – e.g. when two people
 * put an item into the same folder at the same time. Therefore `item.folderId` and `folder.parentId`
 * are always authoritative; the order lists are completed or cleaned up from them.
 */
import { produce, type Draft } from 'immer';
import type { Folder, Item, Project } from '../types';
import { LIST_KIND_NAMES, LIST_KINDS, type Envelope, type ListKind, type ProjectMeta } from './format';

/** Folder for items whose folder was deleted by someone else while they were being created. */
export const RECOVERY_FOLDER_ID = 'f_wiederhergestellt';

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
  return (a: string, b: string) => (items[a].createdAt ?? 0) - (items[b].createdAt ?? 0) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Repairs the folder structure of an (Immer) project. Only changes what is wrong. */
export function normalizeTree(draft: Draft<Project>): void {
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
    while (queue.length) {
      const id = queue.shift()!;
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
      folders[RECOVERY_FOLDER_ID] = { id: RECOVERY_FOLDER_ID, name: 'Wiederhergestellt', parentId: null, folderIds: [], itemIds: [] };
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
  for (const id of Object.keys(items).sort(byCreatedThenId(items as Record<string, Item>))) {
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
  for (const kind of LIST_KIND_NAMES) {
    const field = LIST_KINDS[kind].field;
    const list = (draft[field] ?? []) as Array<{ id: string }>;
    const ids = list.map((g) => g.id);
    if (new Set(ids).size !== ids.length) {
      const seen = new Set<string>();
      (draft as unknown as Record<string, unknown>)[field] = list.filter((g) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      });
    }
  }
}

/**
 * Applies changes from the folder. Returns a new project; unchanged parts remain
 * the same objects (important for undo/redo and change detection).
 */
export function applyRemoteEntities(project: Project, envelopes: Envelope[]): Project {
  const orders: Partial<Record<ListKind, string[]>> = {};
  const overlaid = produce(project, (draft) => {
    for (const kind of LIST_KIND_NAMES) {
      const field = LIST_KINDS[kind].field;
      if (!Array.isArray(draft[field])) (draft as unknown as Record<string, unknown>)[field] = [];
    }
    for (const env of envelopes) {
      switch (env.kind) {
        case 'project': {
          if (env.deleted || !env.data) break;
          const meta = env.data as ProjectMeta;
          draft.name = meta.name;
          draft.namespace = meta.namespace;
          draft.settings = meta.settings as Draft<Project['settings']>;
          draft.rootFolderIds = [...meta.rootFolderIds];
          if (typeof meta.createdAt === 'number') draft.createdAt = meta.createdAt;
          for (const kind of LIST_KIND_NAMES) {
            const order = meta[LIST_KINDS[kind].order];
            if (Array.isArray(order)) orders[kind] = order;
          }
          break;
        }
        case 'folder':
          if (env.deleted) delete draft.folders[env.id];
          else draft.folders[env.id] = env.data as Folder;
          break;
        case 'item':
          if (env.deleted) delete draft.items[env.id];
          else draft.items[env.id] = env.data as Draft<Item>;
          break;
        default: {
          const list = draft[LIST_KINDS[env.kind].field] as Array<{ id: string }>;
          const index = list.findIndex((g) => g.id === env.id);
          if (env.deleted) {
            if (index >= 0) list.splice(index, 1);
          } else if (index >= 0) list[index] = env.data as { id: string };
          else list.push(env.data as { id: string });
          break;
        }
      }
    }
  });
  // Second pass: applied objects are now part of the project and may be adjusted
  return produce(overlaid, (draft) => {
    for (const kind of LIST_KIND_NAMES) {
      const wanted = orders[kind];
      if (!wanted) continue;
      const field = LIST_KINDS[kind].field;
      const list = draft[field] as Array<{ id: string }>;
      const order = new Map(wanted.map((id, i) => [id, i]));
      const sorted = [...list].sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
      if (sorted.some((g, i) => g.id !== list[i].id)) (draft as unknown as Record<string, unknown>)[field] = sorted;
    }
    normalizeTree(draft);
    draft.updatedAt = Math.max(draft.updatedAt, Date.now());
  });
}

/** Builds a project entirely from the files of a shared folder. */
export function projectFromEnvelopes(meta: Envelope, envelopes: Envelope[]): Project {
  const data = meta.data as ProjectMeta;
  const base: Project = {
    formatVersion: 1,
    id: data.id,
    name: data.name,
    namespace: data.namespace,
    settings: data.settings,
    folders: {},
    items: {},
    rootFolderIds: [...data.rootFolderIds],
    glyphs: [],
    sounds: [],
    paintings: [],
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
  return applyRemoteEntities(base, [meta, ...envelopes.filter((e) => e.kind !== 'project')]);
}
