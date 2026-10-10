/**
 * Übernimmt Änderungen aus dem geteilten Ordner in ein Projekt und repariert danach die Ordnerstruktur.
 *
 * Weil jeder Eintrag einzeln abgeglichen wird, können sich Listen widersprechen – z.B. wenn zwei Personen
 * gleichzeitig ein Item in denselben Ordner legen. Maßgeblich sind deshalb immer `item.folderId` und
 * `folder.parentId`; die Reihenfolge-Listen werden daraus ergänzt bzw. bereinigt.
 */
import { produce, type Draft } from 'immer';
import type { Folder, Item, Project } from '../types';
import type { Glyph } from '../nexo/glyphs';
import type { Envelope, ProjectMeta } from './format';

/** Ordner für Items, deren Ordner von jemand anderem gelöscht wurde, während sie angelegt wurden. */
export const RECOVERY_FOLDER_ID = 'f_wiederhergestellt';

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Behält die bekannte Reihenfolge, entfernt Ungültiges/Doppeltes und hängt Fehlendes an. */
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

/** Repariert die Ordnerstruktur eines (Immer-)Projekts. Ändert nur, was nicht stimmt. */
export function normalizeTree(draft: Draft<Project>): void {
  const folders = draft.folders;
  const items = draft.items;
  const folderIds = Object.keys(folders).sort();

  // Ordner, deren Elternordner fehlt, kommen nach oben
  for (const id of folderIds) {
    const folder = folders[id];
    if (folder.parentId !== null && (!folders[folder.parentId] || folder.parentId === id)) folder.parentId = null;
  }
  // Kreise (A in B, B in A – gleichzeitig verschoben) auflösen
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

  // Items ohne Ordner retten
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

  // Doppelte Glyphen (gleiche interne ID) entfernen
  const glyphIds = draft.glyphs.map((g) => g.id);
  if (new Set(glyphIds).size !== glyphIds.length) {
    const seen = new Set<string>();
    draft.glyphs = draft.glyphs.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });
  }
}

/**
 * Wendet Änderungen aus dem Ordner an. Gibt ein neues Projekt zurück; unveränderte Teile bleiben
 * dieselben Objekte (wichtig für Undo/Redo und die Änderungserkennung).
 */
export function applyRemoteEntities(project: Project, envelopes: Envelope[]): Project {
  let glyphOrder: string[] | null = null;
  const overlaid = produce(project, (draft) => {
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
          glyphOrder = meta.glyphOrder;
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
        case 'glyph': {
          const index = draft.glyphs.findIndex((g) => g.id === env.id);
          if (env.deleted) {
            if (index >= 0) draft.glyphs.splice(index, 1);
          } else if (index >= 0) draft.glyphs[index] = env.data as Glyph;
          else draft.glyphs.push(env.data as Glyph);
          break;
        }
      }
    }
  });
  // Zweiter Durchgang: übernommene Objekte sind jetzt Teil des Projekts und dürfen angepasst werden
  return produce(overlaid, (draft) => {
    if (glyphOrder) {
      const order = new Map(glyphOrder.map((id, i) => [id, i]));
      const sorted = [...draft.glyphs].sort(
        (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
      if (sorted.some((g, i) => g.id !== draft.glyphs[i].id)) draft.glyphs = sorted;
    }
    normalizeTree(draft);
    draft.updatedAt = Math.max(draft.updatedAt, Date.now());
  });
}

/** Baut ein Projekt komplett aus den Dateien eines geteilten Ordners. */
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
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
  return applyRemoteEntities(base, [meta, ...envelopes.filter((e) => e.kind !== 'project')]);
}
