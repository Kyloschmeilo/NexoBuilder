/**
 * Lokaler Testserver: Zustand für die Oberfläche und automatisches Übertragen des Projekts.
 *
 * Ändert sich das Projekt, während der Server läuft, werden die Dateien kurz danach nach
 * plugins/Nexo geschrieben und Nexo mit „nexo reload all“ neu geladen. Spieler bekommen das
 * neue Resourcepack dabei automatisch.
 */
import { create } from 'zustand';
import { planExport } from '@nexobuilder/core/export/plan';
import { nexoFolderFiles, nexoGiveCommand, patchNexoSettings } from '@nexobuilder/core/testserver/files';
import { desktopTestServer, type TestServerConfig, type TestServerLogLine, type TestServerState, type TestServerSyncResult } from './desktop';
import { useStore } from './store';

const AUTO_SYNC_DELAY_MS = 1200;
const LOG_LIMIT = 2000;

interface TestServerUi {
  state: TestServerState | null;
  log: TestServerLogLine[];
  syncing: boolean;
  /** Letzte Übertragung, bei der sich etwas geändert hat */
  lastResult: (TestServerSyncResult & { at: number }) | null;
  /** Zeitpunkt des letzten Abgleichs (auch ohne Änderungen) */
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
  if (!testServer) throw new Error('Der Testserver funktioniert nur im Windows-Programm (NexoBuilder.exe).');
  return testServer;
};

let syncTimer: number | undefined;
let syncRunning: Promise<TestServerSyncResult | null> | null = null;
let syncAgain = false;

/** Schreibt das geöffnete Projekt in den Testserver. */
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
      useTestServerStore.setState({ syncError: (err as Error).message });
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

/** Beim Start der App aufrufen. */
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
      // Während des Starts Geändertes nachreichen
      if (before === 'starting' && event.state.status === 'running') void syncProject(true);
    }
  });
  void testServer.getState().then(({ log, ...state }) => useTestServerStore.setState({ state, log }));
  useStore.subscribe((s, prev) => {
    if (s.project && s.project !== prev.project) scheduleAutoSync();
  });
}

/* ------------------------------------------------------------------ Aktionen */

let configSaving: Promise<unknown> = Promise.resolve();
let configSeq = 0;

/**
 * Einstellung ändern: sofort anzeigen (sonst springen Häkchen und Auswahl kurz zurück) und der Reihe nach speichern.
 * Starten wartet, bis alles gespeichert ist – sonst sähe der Server z.B. die EULA-Zustimmung noch nicht.
 */
export function setTestServerConfig(patch: Partial<TestServerConfig>): Promise<void> {
  const before = useTestServerStore.getState().state;
  if (before) useTestServerStore.setState({ state: { ...before, config: { ...before.config, ...patch } } });
  const seq = ++configSeq;
  const run = configSaving.then(async () => {
    try {
      const state = await api().setConfig(patch);
      // Nur die Antwort auf die letzte Änderung übernehmen, damit Zwischenstände nichts zurücksetzen
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
  // Dateien liegen schon bereit, bevor Nexo zum ersten Mal startet
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

/** „nexo reload all“ – wartet, falls Nexo gerade noch das Resourcepack baut */
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

/** Gibt dem eigenen Spieler ein Item (über die Server-Konsole). */
export async function giveInTestServer(nexoId: string, amount = 1): Promise<string> {
  const state = useTestServerStore.getState().state;
  const player = state?.config.playerName;
  if (!state || state.status !== 'running') throw new Error('Der Testserver läuft nicht.');
  if (!player) throw new Error('Bitte im Testserver-Tab deinen Minecraft-Namen eintragen.');
  // Erst die neuesten Dateien übertragen, damit das Item sicher existiert (Nexo lädt im Hintergrund neu)
  const result = await syncProject(true);
  if (result?.reloaded) await new Promise((resolve) => window.setTimeout(resolve, 2500));
  await api().command(nexoGiveCommand(nexoId, amount, player));
  return player;
}
