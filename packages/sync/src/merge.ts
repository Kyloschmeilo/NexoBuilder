/**
 * Applies changes from the shared folder to a project and then repairs the folder structure.
 *
 * Because each entry is synced individually, lists can contradict each other – e.g. when two people
 * put an item into the same folder at the same time (see project/repair for how that is resolved).
 */
import { produce, type Draft } from 'immer';
import {
  MEDIA_KIND_LIST,
  MEDIA_KINDS,
  type MediaEntry,
  type MediaKind,
  mediaList,
  migrateProject,
  type Project,
  repairProject,
  setMediaList,
} from '@resourcepackbuilder/core/project';
import type { Envelope, ProjectMeta } from './format';

type ListUpdate = <T extends { id: string }>(list: T[], kind: MediaKind) => T[];

/** Replaces each project list (glyphs, sounds, paintings) by `update(list)` if that returns a new array. */
function updateLists(draft: Draft<Project>, update: ListUpdate): void {
  for (const kind of MEDIA_KIND_LIST) {
    const list = mediaList(draft as Project, kind);
    const next = update(list, kind);
    if (next !== list) setMediaList(draft as Project, kind, next);
  }
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
    repairProject(draft as Project);
    draft.updatedAt = Math.max(draft.updatedAt, now);
  });
}

function applyMeta(draft: Draft<Project>, meta: ProjectMeta, orders: Partial<Record<MediaKind, string[]>>): void {
  draft.name = meta.name;
  draft.namespace = meta.namespace;
  draft.settings = meta.settings;
  // Files without a target come from versions that know neither it nor the CraftEngine data: both stay
  if (meta.target) {
    draft.target = meta.target;
    if (meta.craftEngine) draft.craftEngine = meta.craftEngine;
    else delete draft.craftEngine;
  }
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
  // The project data goes through the same checks as a stored project; the entries come from the envelopes
  const base = migrateProject(
    {
      id: meta.id,
      name: meta.name,
      target: meta.target,
      namespace: meta.namespace,
      settings: meta.settings,
      craftEngine: meta.craftEngine,
      createdAt: meta.createdAt,
      updatedAt: now,
    },
    now,
  );
  return applyRemoteEntities({ ...base, rootFolderIds: [...meta.rootFolderIds] }, envelopes, now);
}
