/**
 * The local test server (desktop program only): mirrors its state for the UI and transfers the project.
 *
 * While the server runs with automatic updates, every project change is written to plugins/Nexo shortly afterwards
 * and Nexo is reloaded ("nexo reload all"); players get the new resource pack automatically.
 */
import { planExport } from '@resourcepackbuilder/core/export/plan';
import { compareVersions } from '@resourcepackbuilder/core/minecraft/versions';
import { TEST_SERVER_LOG_LIMIT } from '@resourcepackbuilder/core/testServer/config';
import { nexoFolderFiles, nexoGiveCommand, patchNexoSettings } from '@resourcepackbuilder/core/testServer/files';
import { AppError } from '../i18n/errors';
import type { DesktopTestServerApi, NexoJarInfo, TestServerConfigPatch, TestServerSyncResult } from '../platform/desktopApi';
import { useProjectStore } from '../store/project';
import { useTestServerStore } from '../store/testServer';
import { createSerialTask } from './serialTask';

const AUTO_SYNC_DELAY_MS = 1200;
/** Wait after a reload when Nexo's pack build cannot be followed (no Nexo JAR configured). */
const UNTRACKED_RELOAD_MS = 2500;

export interface TestServerSync {
  /** Writes the open project into the server; resolves with a transfer that started after the call. */
  sync(reload: boolean): Promise<TestServerSyncResult | null>;
  /**
   * Changes settings: shown immediately (otherwise checkboxes and selects briefly jump back) and saved in order.
   * Starting waits until everything is saved – otherwise the server would e.g. not see the EULA acceptance yet.
   */
  setConfig(patch: TestServerConfigPatch): Promise<void>;
  chooseNexoJar(): Promise<NexoJarInfo | null>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  command(command: string): Promise<boolean>;
  /** "nexo reload all" – waits if Nexo is still building the resource pack. */
  reload(): Promise<boolean>;
  clearLog(): Promise<void>;
  openFolder(): void;
  /**
   * Loads the Paper versions into the store (once; again after a failure). Without a chosen version the project's
   * version becomes the default – or the newest one when Paper does not support it (yet).
   */
  loadPaperVersions(): Promise<void>;
  /** Gives the own player an item via the server console; resolves with the player name. */
  give(nexoId: string, amount?: number): Promise<string>;
  dispose(): void;
}

export function createTestServerSync(api: DesktopTestServerApi): TestServerSync {
  const store = useTestServerStore;
  let autoSyncTimer: ReturnType<typeof setTimeout> | undefined;
  let configSaving: Promise<unknown> = Promise.resolve();
  let configSeq = 0;
  let versionsRequest: Promise<void> | null = null;

  const transfer = createSerialTask<boolean, TestServerSyncResult | null>(
    async (reload) => {
      const project = useProjectStore.getState().project;
      const { server } = store.getState();
      if (!project || !server) return null;
      store.setState({ isSyncing: true });
      try {
        const plan = planExport(project, { includeBinaries: true });
        const files = nexoFolderFiles(project, plan);
        const settings = patchNexoSettings(await api.readSettings(), { packPort: server.config.packPort });
        const result = await api.sync(files, { reload, settings });
        const hasChanged = result.written > 0 || result.deleted > 0 || result.settingsChanged;
        store.setState({ ...(hasChanged && { lastResult: { ...result, at: Date.now() } }), lastCheck: Date.now(), syncError: null });
        return result;
      } catch (err) {
        store.setState({ syncError: err });
        return null;
      } finally {
        store.setState({ isSyncing: false });
      }
    },
    (queued, next) => queued || next,
  );

  /** Resolves when the pack build started by a reload is over (or the server stopped). */
  const reloadDone = (): Promise<void> => {
    const isPackBuilding = () => {
      const { server } = store.getState();
      return server?.status === 'running' && server.pack.status === 'building';
    };
    if (!isPackBuilding()) return new Promise((resolve) => setTimeout(resolve, UNTRACKED_RELOAD_MS));
    return new Promise((resolve) => {
      const unsubscribe = store.subscribe(() => {
        if (isPackBuilding()) return;
        unsubscribe();
        resolve();
      });
    });
  };

  const offEvent = api.onEvent((event) => {
    if (event.type === 'log') {
      const log = [...store.getState().log, ...event.lines];
      store.setState({ log: log.length > TEST_SERVER_LOG_LIMIT ? log.slice(-TEST_SERVER_LOG_LIMIT) : log });
    } else {
      const before = store.getState().server?.status;
      store.setState({ server: event.state });
      // Push changes made during startup
      if (before === 'starting' && event.state.status === 'running') void transfer.run(true);
    }
  });
  void api.getState().then(({ log, ...server }) => store.setState({ server, log }));

  const unsubscribe = useProjectStore.subscribe(({ project }, { project: previous }) => {
    if (!project || project === previous) return;
    clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(() => {
      const { server } = store.getState();
      if (server?.status === 'running' && server.config.autoUpdate) void transfer.run(true);
    }, AUTO_SYNC_DELAY_MS);
  });

  const setConfig = (patch: TestServerConfigPatch): Promise<void> => {
    const { server } = store.getState();
    if (server) store.setState({ server: { ...server, config: { ...server.config, ...patch } } });
    const seq = ++configSeq;
    const run = configSaving.then(async () => {
      try {
        const next = await api.setConfig(patch);
        // Only the answer to the latest change is applied, so intermediate states reset nothing
        if (seq === configSeq) store.setState({ server: next });
      } catch (err) {
        if (seq === configSeq) void api.getState().then(({ log: _log, ...current }) => store.setState({ server: current }));
        throw err;
      }
    });
    configSaving = run.catch(() => undefined);
    return run;
  };

  const fetchPaperVersions = async () => {
    store.setState({ paperVersionsError: null });
    let versions: string[];
    try {
      versions = [...(await api.versions())].sort((a, b) => compareVersions(b, a));
    } catch (err) {
      store.setState({ paperVersionsError: err });
      return;
    }
    store.setState({ paperVersions: versions });
    const { server } = store.getState();
    if (!server || server.config.paperVersion || versions.length === 0) return;
    const projectVersion = useProjectStore.getState().project?.settings.minecraftVersion;
    await setConfig({ paperVersion: projectVersion && versions.includes(projectVersion) ? projectVersion : versions[0] });
  };

  const stop = async () => {
    store.setState({ server: await api.stop() });
  };

  const start = async () => {
    await configSaving;
    // The files are in place before Nexo starts for the first time
    const result = await transfer.run(false);
    const { syncError } = store.getState();
    if (!result && syncError) throw syncError;
    store.setState({ server: await api.start() });
  };

  return {
    sync: (reload) => transfer.run(reload),

    setConfig,
    chooseNexoJar: () => api.chooseNexoJar(),
    start,
    stop,
    async restart() {
      await stop();
      await start();
    },
    command: (command) => api.command(command),
    reload: () => api.reload(),
    async clearLog() {
      await api.clearLog();
      store.setState({ log: [] });
    },
    openFolder() {
      void api.openFolder();
    },
    loadPaperVersions() {
      if (store.getState().paperVersions) return Promise.resolve();
      versionsRequest ??= fetchPaperVersions().finally(() => {
        versionsRequest = null;
      });
      return versionsRequest;
    },

    async give(nexoId, amount = 1) {
      const { server } = store.getState();
      if (!server || server.status !== 'running') throw new AppError('testServer.notRunning');
      const player = server.config.playerName;
      if (!player) throw new AppError('testServer.playerNameMissing');
      // Transfer the latest files first so the item is sure to exist
      const result = await transfer.run(true);
      if (result?.reloaded) await reloadDone();
      await api.command(nexoGiveCommand(nexoId, amount, player));
      return player;
    },

    dispose() {
      offEvent();
      unsubscribe();
      clearTimeout(autoSyncTimer);
    },
  };
}
