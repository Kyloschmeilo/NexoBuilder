/**
 * Stores projects in the browser (IndexedDB), together with what belongs to them: the shared-folder settings and the
 * sync state of shared projects. It owns every storage key; nothing else touches the database.
 */
import { createStore, del, delMany, get, keys, set, setMany, type UseStore } from 'idb-keyval';
import { z } from 'zod';
import { lenientList, lenientNumber, lenientString, plainObject } from '@resourcepackbuilder/core/lenient';
import { SyncStateSchema, type SyncState } from '@resourcepackbuilder/core/sync/engine';
import { AppError } from '../i18n/errors';
import { uid } from '@resourcepackbuilder/core/project/ids';
import { migrateProject } from '@resourcepackbuilder/core/project/migrate';
import type { Project } from '@resourcepackbuilder/core/project/types';

export interface ProjectSummary {
  id: string;
  name: string;
  namespace: string;
  itemCount: number;
  updatedAt: number;
}

/** The index entry of a project. */
export function summarizeProject(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    namespace: project.namespace,
    itemCount: Object.keys(project.items).length,
    updatedAt: project.updatedAt,
  };
}

/** Where a shared project lives and under which name this user edits it. */
export interface ShareConfig {
  /** Shared folder on this computer */
  folder: string;
  /** Name the others see on changes */
  userName: string;
}

export interface ProjectRepository {
  /** `false` when the browser offers no IndexedDB (projects then cannot be stored). */
  readonly available: boolean;
  /** Stored projects, most recently changed first. */
  list(): Promise<ProjectSummary[]>;
  load(id: string): Promise<Project | null>;
  /** Saves the project (and its sync state, if given) in one step and remembers it as the last opened project. */
  save(project: Project, syncState?: SyncState): Promise<void>;
  /** Deletes the project with everything that belongs to it (share settings, sync state, "last project"). */
  remove(id: string): Promise<void>;
  lastProjectId(): Promise<string | null>;
  clearLastProjectId(): Promise<void>;
  loadShareConfig(projectId: string): Promise<ShareConfig | null>;
  saveShareConfig(projectId: string, config: ShareConfig): Promise<void>;
  /** Stops sharing: removes the share settings and the sync state. */
  removeShare(projectId: string): Promise<void>;
  sharedProjectIds(): Promise<Set<string>>;
  loadSyncState(projectId: string): Promise<SyncState | null>;
  saveSyncState(projectId: string, state: SyncState): Promise<void>;
  /** Random, fixed ID of this installation (tells concurrent changes apart). */
  clientId(): Promise<string>;
}

const INDEX_KEY = 'index';
const LAST_KEY = 'last-project';
const CLIENT_ID_KEY = 'client-id';
const projectKey = (id: string) => `project:${id}`;
const shareKey = (id: string) => `share:${id}`;
const syncKey = (id: string) => `sync:${id}`;
const SHARE_PREFIX = 'share:';

/** The project index; broken entries are dropped (the project itself stays stored and is listed again on its next save). */
const IndexSchema = lenientList(
  z.object({
    id: z.string(),
    name: z.string(),
    namespace: lenientString(),
    itemCount: lenientNumber(0),
    updatedAt: lenientNumber(0),
  }),
) satisfies z.ZodType<ProjectSummary[], unknown>;
const ShareConfigSchema = z.object({ folder: z.string(), userName: z.string() }) satisfies z.ZodType<ShareConfig, unknown>;

/** The browser offers no IndexedDB; worded by the app's error messages (`app` namespace, `storage.unavailable`). */
export class StorageUnavailableError extends AppError {
  constructor() {
    super('storage.unavailable');
    this.name = 'StorageUnavailableError';
  }
}

/** The repository backed by IndexedDB; without IndexedDB every read is empty and every write fails. */
export function createProjectRepository(): ProjectRepository {
  const db: UseStore | null = typeof indexedDB === 'undefined' ? null : createStore('resourcepackbuilder', 'projects');

  const requireDb = (): UseStore => {
    if (!db) throw new StorageUnavailableError();
    return db;
  };
  /** Stored data is untrusted (any earlier version, or damaged): a value that does not match `schema` reads as null. */
  const read = async <S extends z.ZodType>(key: string, schema: S): Promise<z.output<S> | null> =>
    db ? (schema.safeParse(await get(key, db)).data ?? null) : null;
  const readIndex = async () => (await read(INDEX_KEY, IndexSchema)) ?? [];

  return {
    available: db !== null,

    async list() {
      return [...(await readIndex())].sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async load(id) {
      const raw = await read(projectKey(id), plainObject());
      return raw ? migrateProject(raw) : null;
    },

    async save(project, syncState) {
      const store = requireDb();
      const index = [summarizeProject(project), ...(await readIndex()).filter((p) => p.id !== project.id)];
      const entries: Array<[string, unknown]> = [
        [projectKey(project.id), project],
        [INDEX_KEY, index],
        [LAST_KEY, project.id],
      ];
      if (syncState) entries.push([syncKey(project.id), syncState]);
      await setMany(entries, store);
    },

    async remove(id) {
      if (!db) return;
      const index = (await readIndex()).filter((p) => p.id !== id);
      const last = await read(LAST_KEY, z.string());
      await delMany([projectKey(id), shareKey(id), syncKey(id), ...(last === id ? [LAST_KEY] : [])], db);
      await set(INDEX_KEY, index, db);
    },

    async lastProjectId() {
      return read(LAST_KEY, z.string());
    },

    async clearLastProjectId() {
      if (db) await del(LAST_KEY, db);
    },

    async loadShareConfig(projectId) {
      return read(shareKey(projectId), ShareConfigSchema);
    },

    async saveShareConfig(projectId, config) {
      await set(shareKey(projectId), config, requireDb());
    },

    async removeShare(projectId) {
      if (db) await delMany([shareKey(projectId), syncKey(projectId)], db);
    },

    async sharedProjectIds() {
      if (!db) return new Set<string>();
      const all = await keys(db);
      return new Set(
        all.filter((k): k is string => typeof k === 'string' && k.startsWith(SHARE_PREFIX)).map((k) => k.slice(SHARE_PREFIX.length)),
      );
    },

    async loadSyncState(projectId) {
      return read(syncKey(projectId), SyncStateSchema);
    },

    async saveSyncState(projectId, state) {
      if (db) await set(syncKey(projectId), state, db);
    },

    async clientId() {
      if (!db) return uid('c_');
      const existing = await read(CLIENT_ID_KEY, z.string());
      if (existing) return existing;
      const id = uid('c_');
      await set(CLIENT_ID_KEY, id, db);
      return id;
    },
  };
}
