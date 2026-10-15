/**
 * Local test server: state for the UI and automatic transfer of the project.
 *
 * If the project changes while the server is running, the files are written to plugins/Nexo
 * shortly afterwards and Nexo is reloaded with "nexo reload all". Players get the
 * new resource pack automatically.
 */
import { create } from 'zustand';
import { planExport } from '@resourcepackbuilder/core/export/plan';
import { nexoFolderFiles, nexoGiveCommand, patchNexoSettings } from '@resourcepackbuilder/core/testserver/files';
import { desktopTestServer, type TestServerConfig, type TestServerLogLine, type TestServerState, type TestServerSyncResult } from './desktop';
import { errorMessage } from '../i18n/errors';
import { translator } from '../i18n/locale';
import { useStore } from './store';

const AUTO_SYNC_DELAY_MS = 1200;
const LOG_LIMIT = 2000;

interface TestServerUi {
  state: TestServerState | null;
  log: TestServerLogLine[];
  syncing: boolean;
  /** Last transfer in which something changed */
  lastResult: (TestServerSyncResult & { at: number }) | null;
  /** Time of the last sync (even without changes) */
  lastCheck: number | null;
  syncError: string | null;
}

export const useTestServerStore = create<TestServerUi>(() => ({
  state: null,
  log: [],
  syncing: false,
  lastResult: null,
  lastCheck: null,
  syncError: null,
}));

export function isTestServerAvailable(): boolean {
  return desktopTestServer() !== null;
}

const api = () => {
  const testServer = desktopTestServer();
  if (!testServer) throw new Error(translator('state')('testServer.desktopOnly'));
  return testServer;
};

let syncTimer: number | undefined;
let syncRunning: Promise<TestServerSyncResult | null> | null = null;
let syncAgain = false;

/** Writes the open project into the test server. */
export async function syncProject(reload: boolean): Promise<TestServerSyncResult | null> {
  if (syncRunning) {
    syncAgain = true;
    return syncRunning;
  }
  const run = async () => {
    const project = useStore.getState().project;
    const state = useTestServerStore.getState().state;
    if (!project || !state) return null;
    useTestServerStore.setState({ syncing: true });
    try {
      const plan = planExport(project, { includeBinaries: true });
      const files = nexoFolderFiles(project, plan);
      const settings = patchNexoSettings(await api().readSettings(), { packPort: state.config.packPort });
      const result = await api().sync(files, { reload, settings });
      const changed = result.written > 0 || result.deleted > 0 || result.settingsChanged;
      useTestServerStore.setState({
        ...(changed ? { lastResult: { ...result, at: Date.now() } } : {}),
        lastCheck: Date.now(),
        syncError: null,
      });
      return result;
    } catch (err) {
      useTestServerStore.setState({ syncError: errorMessage(err) });
      return null;
    } finally {
      useTestServerStore.setState({ syncing: false });
    }
  };
  syncRunning = run();
  try {
    return await syncRunning;
  } finally {
    syncRunning = null;
    if (syncAgain) {
      syncAgain = false;
      void syncProject(reload);
    }
  }
}

function scheduleAutoSync() {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    const state = useTestServerStore.getState().state;
    if (state?.status === 'running' && state.config.autoUpdate) void syncProject(true);
  }, AUTO_SYNC_DELAY_MS);
}

/** Call on app startup. */
export function startTestServerController() {
  const testServer = desktopTestServer();
  if (!testServer) return;
  testServer.onEvent((event) => {
    if (event.type === 'log') {
      const log = [...useTestServerStore.getState().log, ...event.lines];
      useTestServerStore.setState({ log: log.length > LOG_LIMIT ? log.slice(-LOG_LIMIT) : log });
    } else {
      const before = useTestServerStore.getState().state?.status;
      useTestServerStore.setState({ state: event.state });
      // Push changes made during startup
      if (before === 'starting' && event.state.status === 'running') void syncProject(true);
    }
  });
  void testServer.getState().then(({ log, ...state }) => useTestServerStore.setState({ state, log }));
  useStore.subscribe((s, prev) => {
    if (s.project && s.project !== prev.project) scheduleAutoSync();
  });
}

/* ------------------------------------------------------------------ Actions */

let configSaving: Promise<unknown> = Promise.resolve();
let configSeq = 0;

/**
 * Change a setting: show it immediately (otherwise checkboxes and selects briefly jump back) and save in order.
 * Starting waits until everything is saved – otherwise the server would e.g. not see the EULA acceptance yet.
 */
export function setTestServerConfig(patch: Partial<TestServerConfig>): Promise<void> {
  const before = useTestServerStore.getState().state;
  if (before) useTestServerStore.setState({ state: { ...before, config: { ...before.config, ...patch } } });
  const seq = ++configSeq;
  const run = configSaving.then(async () => {
    try {
      const state = await api().setConfig(patch);
      // Only apply the response to the latest change so intermediate states do not reset anything
      if (seq === configSeq) useTestServerStore.setState({ state });
    } catch (err) {
      if (seq === configSeq) void api().getState().then(({ log: _log, ...state }) => useTestServerStore.setState({ state }));
      throw err;
    }
  });
  configSaving = run.catch(() => undefined);
  return run;
}

export async function chooseNexoJar() {
  return api().chooseNexoJar();
}

export async function startTestServer() {
  await configSaving;
  // Files are already in place before Nexo starts for the first time
  const result = await syncProject(false);
  if (!result && useTestServerStore.getState().syncError) throw new Error(useTestServerStore.getState().syncError!);
  const state = await api().start();
  useTestServerStore.setState({ state });
}

export async function stopTestServer() {
  const state = await api().stop();
  useTestServerStore.setState({ state });
}

export async function restartTestServer() {
  await stopTestServer();
  await startTestServer();
}

export async function sendTestServerCommand(command: string) {
  return api().command(command);
}

/** "nexo reload all" – waits if Nexo is still building the resource pack */
export async function reloadNexo() {
  return api().reload();
}

export async function clearTestServerLog() {
  await api().clearLog();
  useTestServerStore.setState({ log: [] });
}

export function openTestServerFolder() {
  void api().openFolder();
}

export function loadPaperVersions() {
  return api().versions();
}

/** Gives the own player an item (via the server console). */
export async function giveInTestServer(nexoId: string, amount = 1): Promise<string> {
  const state = useTestServerStore.getState().state;
  const player = state?.config.playerName;
  if (!state || state.status !== 'running') throw new Error(translator('state')('testServer.notRunning'));
  if (!player) throw new Error(translator('state')('testServer.playerNameMissing'));
  // Transfer the latest files first so the item is sure to exist (Nexo reloads in the background)
  const result = await syncProject(true);
  if (result?.reloaded) await new Promise((resolve) => window.setTimeout(resolve, 2500));
  await api().command(nexoGiveCommand(nexoId, amount, player));
  return player;
}
