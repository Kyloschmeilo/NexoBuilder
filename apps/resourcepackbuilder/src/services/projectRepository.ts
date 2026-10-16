/**
 * Stores projects in the browser (IndexedDB), together with what belongs to them: the shared-folder settings and the
 * sync state of shared projects. It owns every storage key; nothing else touches the database.
 */
import { createStore, del, delMany, get, keys, set, setMany, type UseStore } from 'idb-keyval';
import type { SyncState } from '@resourcepackbuilder/core/sync/engine';
import { uid } from '@resourcepackbuilder/core/project/ids';
import { migrateProject } from '@resourcepackbuilder/core/project/migrate';
import { summarizeProject, type ProjectSummary } from '@resourcepackbuilder/core/project/summary';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { AppError } from '../i18n/errors';

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

/** The repository backed by IndexedDB; without IndexedDB every read is empty and every write fails. */
export function createProjectRepository(): ProjectRepository {
  const db: UseStore | null = typeof indexedDB === 'undefined' ? null : createStore('resourcepackbuilder', 'projects');

  const requireDb = (): UseStore => {
    if (!db) throw new AppError('storage.unavailable');
    return db;
  };
  const read = async <T>(key: string): Promise<T | null> => (db ? (((await get(key, db)) as T | undefined) ?? null) : null);
  const readIndex = async () => (await read<ProjectSummary[]>(INDEX_KEY)) ?? [];

  return {
    available: db !== null,

    async list() {
      return [...(await readIndex())].sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async load(id) {
      const raw = await read<unknown>(projectKey(id));
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
      const last = await read<string>(LAST_KEY);
      await delMany([projectKey(id), shareKey(id), syncKey(id), ...(last === id ? [LAST_KEY] : [])], db);
      await set(INDEX_KEY, index, db);
    },

    async lastProjectId() {
      return read<string>(LAST_KEY);
    },

    async clearLastProjectId() {
      if (db) await del(LAST_KEY, db);
    },

    async loadShareConfig(projectId) {
      return read<ShareConfig>(shareKey(projectId));
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
      return read<SyncState>(syncKey(projectId));
    },

    async saveSyncState(projectId, state) {
      if (db) await set(syncKey(projectId), state, db);
    },

    async clientId() {
      if (!db) return uid('c_');
      const existing = await read<string>(CLIENT_ID_KEY);
      if (existing) return existing;
      const id = uid('c_');
      await set(CLIENT_ID_KEY, id, db);
      return id;
    },
  };
}
