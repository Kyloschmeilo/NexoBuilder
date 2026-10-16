/**
 * The local test server (desktop program only): mirrors its state for the UI and transfers the project.
 *
 * While the server runs with automatic updates, every project change is written to the plugin folder of the project's
 * target (e.g. plugins/Nexo) shortly afterwards and the plugin is reloaded ("nexo reload all"); players get the new
 * resource pack automatically. A server that runs another target's plugin is never written to.
 */
import { DEFAULT_PACK_TARGET, type Item, type PackTargetId } from '@resourcepackbuilder/core/project';
import { exportPackName, packTargetFor, planExport } from '@resourcepackbuilder/export';
import { compareVersions } from '@resourcepackbuilder/minecraft';
import { isConfigLocked, pluginFolderFiles, serverAdapterFor, TEST_SERVER_LOG_LIMIT } from '@resourcepackbuilder/test-server';
import { AppError } from '../i18n/errors';
import { asError } from '../lib/asError';
import type {
  DesktopTestServerApi,
  PluginJarInfo,
  TestServerConfigPatch,
  TestServerState,
  TestServerSyncResult,
} from '../platform/desktopApi';
import { useProjectStore } from '../store/project';
import { useTestServerStore } from './testServerStore';
import { createSerialTask } from './serialTask';
import { watchOpenProject } from './watchOpenProject';

const AUTO_SYNC_DELAY_MS = 1200;

/** The server is up (or on its way) with the plugin of another target than `target`. */
export function serverRunsOtherTarget(server: TestServerState | null, target: PackTargetId): boolean {
  return server !== null && isConfigLocked(server.status) && server.target !== null && server.target !== target;
}

/** The error for an action on a server that runs the plugin of another target than the project's. */
export function wrongTargetError(serverTarget: PackTargetId, projectTarget: PackTargetId): AppError {
  return new AppError('errors.testServer.wrongTarget', {
    server: serverAdapterFor(serverTarget).pluginName,
    project: serverAdapterFor(projectTarget).pluginName,
  });
}

/** The server's pack builds can be followed: it runs a plugin JAR, and the plugin reports its builds. */
function tracksPackBuild(server: TestServerState): boolean {
  const { target } = server;
  return target !== null && Boolean(server.config.pluginJars[target]) && serverAdapterFor(target).reportsPackBuild;
}

export interface TestServerSync {
  /** Writes the open project into the server; resolves with a transfer that started after the call. */
  sync(reload: boolean): Promise<TestServerSyncResult | null>;
  /**
   * Changes settings: shown immediately (otherwise checkboxes and selects briefly jump back) and saved in order.
   * Starting waits until everything is saved – otherwise the server would e.g. not see the EULA acceptance yet.
   */
  setConfig(patch: TestServerConfigPatch): Promise<void>;
  choosePluginJar(target: PackTargetId): Promise<PluginJarInfo | null>;
  /** Downloads the target's plugin JAR (CraftEngine from Modrinth) for the chosen Paper version. */
  downloadPlugin(target: PackTargetId): Promise<PluginJarInfo>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  command(command: string): Promise<boolean>;
  /** The plugin's reload ("nexo reload all") – waits if it is still building the resource pack. */
  reload(): Promise<boolean>;
  clearLog(): Promise<void>;
  openFolder(): void;
  /**
   * Loads the Paper versions into the store (once; again after a failure). Without a chosen version the project's
   * version becomes the default – or the newest one when Paper does not support it (yet).
   */
  loadPaperVersions(): Promise<void>;
  /** Gives the own player an item of the open project via the server console; resolves with the player name. */
  give(item: Item, amount?: number): Promise<string>;
  dispose(): void;
}

export function createTestServerSync(api: DesktopTestServerApi): TestServerSync {
  const store = useTestServerStore;
  let configSeq = 0;
  let versionsRequest: Promise<void> | null = null;

  const transfer = createSerialTask<boolean, TestServerSyncResult | null>(
    async (reload) => {
      const project = useProjectStore.getState().project;
      const { server } = store.getState();
      if (!project || !server) return null;
      if (server.target && serverRunsOtherTarget(server, project.target)) {
        store.setState({ syncError: wrongTargetError(server.target, project.target) });
        return null;
      }
      store.setState({ isSyncing: true });
      try {
        const { target } = project;
        const plan = planExport(project, { includeBinaries: true });
        const files = pluginFolderFiles(project, plan);
        const config = serverAdapterFor(target).patchConfig(await api.readPluginConfig(target), { packPort: server.config.packPort });
        // An empty config means the adapter has nothing to set: the plugin writes its own file
        const options = { target, packName: exportPackName(project), reload, ...(config && { settings: config }) };
        const result = await api.sync(files, options);
        const hasChanged = result.written > 0 || result.deleted > 0 || result.settingsChanged;
        store.setState({ ...(hasChanged && { lastResult: { ...result, at: Date.now() } }), lastCheck: Date.now(), syncError: null });
        return result;
      } catch (err) {
        store.setState({ syncError: asError(err) });
        return null;
      } finally {
        store.setState({ isSyncing: false });
      }
    },
    (queued, next) => queued || next,
  );

  /**
   * Resolves once the plugin has finished the pack build that a reload requested at `requestedAt` started. The desktop
   * program marks the pack as building when it sends the reload and times a stuck build out, so this always settles.
   * Without a plugin JAR (or a plugin that does not report its builds) there is no pack to wait for.
   */
  const reloadDone = (requestedAt: number): Promise<void> => {
    const isSettled = () => {
      const { server } = store.getState();
      if (!server || server.status !== 'running' || !tracksPackBuild(server)) return true;
      const { pack } = server;
      return pack.status !== 'building' && pack.at !== null && pack.at >= requestedAt;
    };
    if (isSettled()) return Promise.resolve();
    return new Promise((resolve) => {
      const unsubscribe = store.subscribe(() => {
        if (!isSettled()) return;
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
  api.getState().then(
    ({ log, ...server }) => store.setState({ server, log }),
    (err: unknown) => console.warn('Could not read the test server state', err),
  );

  const watcher = watchOpenProject({
    onSettled() {
      const { server } = store.getState();
      if (server?.status === 'running' && server.config.autoUpdate) void transfer.run(true);
    },
    debounceMs: AUTO_SYNC_DELAY_MS,
  });

  /** Saves settings in order; changes made while one is saved are merged into the next save */
  const saveConfig = createSerialTask<{ patch: TestServerConfigPatch; seq: number }, void>(
    async ({ patch, seq }) => {
      try {
        const next = await api.setConfig(patch);
        // Only the answer to the latest change is applied, so intermediate states reset nothing
        if (seq === configSeq) store.setState({ server: next });
      } catch (err) {
        if (seq === configSeq) {
          api.getState().then(
            ({ log: _log, ...current }) => store.setState({ server: current }),
            (stateErr: unknown) => console.warn('Could not read the test server state', stateErr),
          );
        }
        throw err;
      }
    },
    (queued, next) => ({ patch: { ...queued.patch, ...next.patch }, seq: next.seq }),
  );

  const setConfig = (patch: TestServerConfigPatch): Promise<void> => {
    const { server } = store.getState();
    if (server) store.setState({ server: { ...server, config: { ...server.config, ...patch } } });
    return saveConfig.run({ patch, seq: ++configSeq });
  };

  const fetchPaperVersions = async () => {
    store.setState({ paperVersionsError: null });
    let versions: string[];
    try {
      versions = [...(await api.versions())].sort((a, b) => compareVersions(b, a));
    } catch (err) {
      store.setState({ paperVersionsError: asError(err) });
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
    await saveConfig.idle();
    // The files are in place before the plugin starts for the first time
    const result = await transfer.run(false);
    const { syncError } = store.getState();
    if (!result && syncError) throw syncError;
    const target = useProjectStore.getState().project?.target ?? DEFAULT_PACK_TARGET;
    store.setState({ server: await api.start(target) });
  };

  /** Throws when the server runs the plugin of another target than the open project's. */
  const assertSameTarget = () => {
    const project = useProjectStore.getState().project;
    const { server } = store.getState();
    if (project && server?.target && serverRunsOtherTarget(server, project.target)) {
      throw wrongTargetError(server.target, project.target);
    }
  };

  return {
    sync: (reload) => transfer.run(reload),

    setConfig,
    choosePluginJar: (target) => api.choosePluginJar(target),
    async downloadPlugin(target) {
      // The download is for the Paper version; a version change still in flight must be saved first
      await saveConfig.idle();
      return api.downloadPlugin(target);
    },
    start,
    stop,
    async restart() {
      await stop();
      await start();
    },
    command: (command) => api.command(command),
    async reload() {
      assertSameTarget();
      return api.reload();
    },
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

    async give(item, amount = 1) {
      const { server } = store.getState();
      const project = useProjectStore.getState().project;
      if (!server || !project || server.status !== 'running') throw new AppError('errors.testServer.notRunning');
      assertSameTarget();
      const player = server.config.playerName;
      if (!player) throw new AppError('errors.testServer.playerNameMissing');
      // Transfer the latest files first so the item is sure to exist
      const requestedAt = Date.now();
      const result = await transfer.run(true);
      if (result?.reloaded) await reloadDone(requestedAt);
      const yamlKey = packTargetFor(project).yamlKey(project, item);
      await api.command(serverAdapterFor(project.target).giveCommand(yamlKey, amount, player));
      return player;
    },

    dispose() {
      offEvent();
      watcher.dispose();
    },
  };
}
