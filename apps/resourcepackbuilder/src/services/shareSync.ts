/**
 * Shared projects: connects the open project to its shared folder and keeps both up to date.
 *
 * - Own changes are batched briefly and then written to the folder.
 * - Changes by others are detected via file events and additionally by polling (cloud folders do not always report
 *   reliably): every few seconds without a working file watcher, rarely while it works.
 */
import { deepClone } from '@resourcepackbuilder/core/object';
import { migrateProject } from '@resourcepackbuilder/core/project/migrate';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { README_FILE, README_TEXT } from '@resourcepackbuilder/core/sync/format';
import {
  readShareFolder,
  ShareFolderError,
  SyncEngine,
  type RemoteChange,
  type SyncFs,
  type SyncState,
} from '@resourcepackbuilder/core/sync/engine';
import { AppError } from '../i18n/errors';
import { asError } from '../lib/asError';
import type { DesktopShareApi } from '../platform/desktopApi';
import { applyRemote, useProjectStore } from '../store/project';
import { DISCONNECTED, useShareStore, type ShareState } from '../store/share';
import type { Autosave } from './autosave';
import { createEvents, type Events } from './events';
import type { ProjectRepository } from './projectRepository';
import { createSerialTask, type SerialTask } from './serialTask';
import { watchOpenProject } from './watchOpenProject';

const POLL_MS = 2500;
/** Polling while the file watcher works: only a fallback for changes it misses */
const WATCHED_POLL_MS = 30_000;
const FLUSH_DELAY_MS = 400;

/** A shared project read from a folder chosen by the user. */
export interface SharedFolderProject {
  folder: string;
  project: Project;
  state: SyncState;
}

export interface ShareSync {
  /** Shares the open project via a folder the user picks. Returns the folder used, or null when cancelled. */
  share(projectFolderName: string, userName: string): Promise<string | null>;
  /** Lets the user pick a shared folder and reads the project in it; null when cancelled. */
  pickSharedProject(): Promise<SharedFolderProject | null>;
  /** Resolves once the open project is connected to its shared folder (if it has one). */
  connect(): Promise<void>;
  /** Stops sharing the open project. Its copy and the folder are kept. */
  stop(): Promise<void>;
  setUserName(userName: string): Promise<void>;
  syncNow(): void;
  openFolder(): void;
  /** The system user name, as suggestion for the name shown to the others ('' if unknown). */
  defaultUserName(): Promise<string>;
  readonly events: Events<RemoteChange[]>;
  dispose(): void;
}

interface Session {
  engine: SyncEngine;
  projectId: string;
  folder: string;
  sync: SerialTask<void, void>;
  stop(): void;
}

interface ShareSyncOptions {
  api: DesktopShareApi;
  repository: ProjectRepository;
  /** Stores the sync state (together with the project while it is connected). */
  autosave: Pick<Autosave, 'requestSave' | 'saveSyncState' | 'attachSyncState'>;
}

export function createShareSync({ api, repository, autosave }: ShareSyncOptions): ShareSync {
  const events = createEvents<RemoteChange[]>();
  let session: Session | null = null;
  let isDisposed = false;
  /** An own change waits to be written to the folder */
  let isLocalChangePending = false;
  const detachSyncState = autosave.attachSyncState((projectId) => (session?.projectId === projectId ? session.engine.state : null));

  const setStatus = (patch: Partial<ShareState>) => useShareStore.setState(patch);

  const folderFs = (folder: string): SyncFs => ({
    list: () => api.list(folder),
    read: (path) => api.read(folder, path),
    write: (path, content) => api.write(folder, path, content),
  });

  const syncOnce = async (s: { engine: SyncEngine; projectId: string; isStopped: boolean }) => {
    if (s.isStopped) return;
    try {
      if (s.engine.pending > 0) setStatus({ status: 'syncing' });
      const result = await s.engine.sync();
      if (s.isStopped) return;
      setStatus({ status: 'synced', error: null, lastSync: Date.now() });
      if (result.applied.length || result.written) autosave.requestSave(s.projectId);
    } catch (err) {
      if (s.isStopped) return;
      if (err instanceof ShareFolderError) {
        setStatus({ status: 'error', error: asError(err) });
        stopSession();
      } else {
        console.warn('Sync failed', err);
        setStatus({ status: 'offline', error: null });
      }
    }
  };

  function stopSession() {
    const s = session;
    if (!s) return;
    session = null;
    s.stop();
  }

  const connectTo = async (projectId: string): Promise<void> => {
    const config = await repository.loadShareConfig(projectId);
    if (!config || isDisposed || useProjectStore.getState().project?.id !== projectId) return;
    setStatus({ projectId, folder: config.folder, userName: config.userName, status: 'connecting', error: null, lastSync: null });
    const state = await repository.loadSyncState(projectId);
    const clientId = await repository.clientId();
    if (isDisposed || useProjectStore.getState().project?.id !== projectId) {
      setStatus(DISCONNECTED); // another project was opened in the meantime
      return;
    }
    const engine = new SyncEngine(
      folderFs(config.folder),
      {
        getProject: () => useProjectStore.getState().project,
        applyRemote: (transform, changes) => {
          applyRemote(transform);
          events.emit(changes);
        },
      },
      { clientId, userName: config.userName },
      state,
    );
    const control = { engine, projectId, isStopped: false };
    const sync = createSerialTask(() => syncOnce(control));
    const offChange = api.onChange(() => void sync.run());
    const poll: { timer?: number } = {};
    session = {
      engine,
      projectId,
      folder: config.folder,
      sync,
      stop: () => {
        control.isStopped = true;
        window.clearInterval(poll.timer);
        offChange();
        engine.stop();
        void api.unwatch(config.folder).catch(() => undefined);
      },
    };
    const isWatching = await api.watch(config.folder).catch(() => false);
    if (control.isStopped) return;
    poll.timer = window.setInterval(() => void sync.run(), isWatching ? WATCHED_POLL_MS : POLL_MS);
    await sync.run();
  };

  const disconnect = async (): Promise<void> => {
    const s = session;
    if (!s) return;
    session = null;
    try {
      await s.engine.flush();
      // Only a state that matches what is in the folder is stored
      autosave.saveSyncState(s.projectId, s.engine.state);
    } catch (err) {
      console.warn('Could not write the last changes to the shared folder; they are written on the next connect', err);
    }
    s.stop();
    setStatus(DISCONNECTED);
  };

  /** Connects the given project (or nothing); calls are serialized and the latest wins. */
  const switchTo = createSerialTask<string | null, void>(async (projectId) => {
    if (session?.projectId === projectId) return;
    await disconnect();
    if (projectId && !isDisposed) await connectTo(projectId);
  });

  const watcher = watchOpenProject({
    onSwitch: (project) => void switchTo.run(project?.id ?? null),
    onChange(project) {
      if (session?.projectId === project.id && session.engine.noteLocalChange(project)) isLocalChangePending = true;
    },
    onSettled() {
      if (!isLocalChangePending) return;
      isLocalChangePending = false;
      void session?.sync.run();
    },
    debounceMs: FLUSH_DELAY_MS,
    onUnload() {
      session?.engine.flush().catch((err: unknown) => console.warn('Could not write the last changes to the shared folder', err));
    },
  });
  void switchTo.run(useProjectStore.getState().project?.id ?? null);

  return {
    async share(projectFolderName, userName) {
      const project = useProjectStore.getState().project;
      if (!project) return null;
      const chosen = await api.chooseFolder('share');
      if (!chosen) return null;
      let folder = chosen;
      const info = await api.inspect(chosen);
      if (info.project) {
        if (info.project.id !== project.id) throw new AppError('share.folderHasOtherProject', { name: info.project.name });
      } else {
        const same = info.children.find((c) => c.projectId === project.id);
        if (same) folder = same.path;
        else if (!info.empty) folder = await api.createSubfolder(chosen, projectFolderName);
      }
      await api.write(folder, README_FILE, README_TEXT);
      await repository.saveShareConfig(project.id, { folder, userName });
      await disconnect();
      await switchTo.run(project.id);
      return folder;
    },

    async pickSharedProject() {
      const chosen = await api.chooseFolder('join');
      if (!chosen) return null;
      let folder = chosen;
      const info = await api.inspect(chosen);
      if (!info.project) {
        if (info.children.length === 1) folder = info.children[0].path;
        else if (info.children.length > 1) {
          throw new AppError('share.folderHasSeveralProjects', { names: info.children.map((c) => c.projectName || c.name).join(', ') });
        } else {
          throw new AppError('share.folderHasNoProject');
        }
      }
      const shared = await readShareFolder(folderFs(folder));
      if (!shared) throw new AppError('share.unreadable');
      return { folder, project: migrateProject(deepClone(shared.project)), state: shared.state };
    },

    async connect() {
      await switchTo.run(useProjectStore.getState().project?.id ?? null);
    },

    async stop() {
      const projectId = useProjectStore.getState().project?.id;
      const folder = session?.folder;
      await disconnect();
      if (projectId) await repository.removeShare(projectId);
      // The desktop program no longer needs access to the folder
      if (folder) await api.forget(folder).catch(() => undefined);
    },

    async setUserName(userName) {
      const s = session;
      if (!s) return;
      s.engine.setUserName(userName);
      const config = await repository.loadShareConfig(s.projectId);
      if (config) await repository.saveShareConfig(s.projectId, { ...config, userName });
      setStatus({ userName });
    },

    syncNow() {
      void session?.sync.run();
    },

    openFolder() {
      const { folder } = useShareStore.getState();
      if (folder) void api.openFolder(folder);
    },

    async defaultUserName() {
      return api.userName().catch(() => '');
    },

    events,

    dispose() {
      isDisposed = true;
      watcher.dispose();
      void disconnect().finally(detachSyncState);
    },
  };
}
