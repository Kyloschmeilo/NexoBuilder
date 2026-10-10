/**
 * Geteilte Projekte: verbindet das geöffnete Projekt mit seinem geteilten Ordner und hält beide aktuell.
 *
 * - Eigene Änderungen werden kurz gesammelt und dann in den Ordner geschrieben.
 * - Änderungen der anderen werden über Datei-Ereignisse und zusätzlich alle paar Sekunden erkannt
 *   (Cloud-Ordner melden nicht immer zuverlässig).
 */
import { create } from 'zustand';
import type { Project } from '../core/types';
import { readShareFolder, ShareFolderError, SyncEngine, type RemoteChange, type SyncFs, type SyncHost, type SyncState } from '../core/sync/engine';
import { README_FILE, README_TEXT } from '../core/sync/format';
import { deepClone } from '../core/util';
import { desktopShare, type DesktopShareApi } from './desktop';
import {
  flushNow,
  getClientId,
  loadProject,
  loadShareConfig,
  loadSyncState,
  migrateProject,
  requestSave,
  saveProject,
  saveShareConfig,
  saveSyncState,
  setExtraSaveProvider,
  type ShareConfig,
} from './persistence';
import { useStore } from './store';

const POLL_MS = 2500;
const FLUSH_DELAY_MS = 400;

export type ShareStatus = 'off' | 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

interface ShareUiState {
  projectId: string | null;
  folder: string | null;
  userName: string;
  status: ShareStatus;
  message: string | null;
  lastSync: number | null;
}

export const useShareStore = create<ShareUiState>(() => ({
  projectId: null,
  folder: null,
  userName: '',
  status: 'off',
  message: null,
  lastSync: null,
}));

export function isShareAvailable(): boolean {
  return desktopShare() !== null;
}

interface Session {
  api: DesktopShareApi;
  engine: SyncEngine;
  projectId: string;
  folder: string;
  pollTimer: number;
  flushTimer: number | undefined;
  offChange: () => void;
  running: boolean;
  again: boolean;
  stopped: boolean;
}

let session: Session | null = null;
let connecting: Promise<void> | null = null;

function makeFs(api: DesktopShareApi, folder: string): SyncFs {
  return {
    list: () => api.list(folder),
    read: (path) => api.read(folder, path),
    write: (path, content) => api.write(folder, path, content),
  };
}

const host: SyncHost = {
  getProject: () => useStore.getState().project,
  applyRemote: (transform, changes) => {
    useStore.getState().applyRemote(transform);
    announce(changes);
  },
};

const ANNOUNCE_QUIET_MS = 15_000;
const lastAnnounced = new Map<string, number>();

/** Kurze Meldung, was die anderen geändert haben (wiederholte Änderungen am selben Eintrag nur alle 15 s) */
function announce(changes: RemoteChange[]) {
  const byPerson = new Map<string, RemoteChange[]>();
  for (const change of changes) {
    const name = change.byName || 'Jemand';
    byPerson.set(name, [...(byPerson.get(name) ?? []), change]);
  }
  const now = Date.now();
  for (const [name, list] of byPerson) {
    const key = `${name}|${list
      .map((c) => `${c.kind}:${c.id}:${c.deleted}`)
      .sort()
      .join(',')}`;
    if (now - (lastAnnounced.get(key) ?? 0) < ANNOUNCE_QUIET_MS) continue;
    lastAnnounced.set(key, now);
    const labels = [...new Set(list.map((c) => c.label).filter(Boolean))];
    const what =
      labels.length === 0
        ? `${list.length} ${list.length === 1 ? 'Eintrag' : 'Einträge'}`
        : labels.length <= 3
          ? labels.map((l) => `„${l}“`).join(', ')
          : `${labels.slice(0, 2).map((l) => `„${l}“`).join(', ')} und ${labels.length - 2} weitere`;
    const verb = list.every((c) => c.deleted) ? 'gelöscht' : 'geändert';
    useStore.getState().toast('info', `${name} hat ${what} ${verb}.`);
  }
}

function setStatus(patch: Partial<ShareUiState>) {
  useShareStore.setState(patch);
}

async function runSync(s: Session): Promise<void> {
  if (s.stopped) return;
  if (s.running) {
    s.again = true;
    return;
  }
  s.running = true;
  try {
    const writing = s.engine.pending > 0;
    if (writing) setStatus({ status: 'syncing' });
    const result = await s.engine.sync();
    if (s.stopped) return;
    setStatus({ status: 'synced', message: null, lastSync: Date.now() });
    if (result.applied.length || result.written) requestSave();
  } catch (err) {
    if (s.stopped) return;
    if (err instanceof ShareFolderError) {
      setStatus({ status: 'error', message: err.message });
      stopSession(s);
    } else {
      console.warn('Abgleich fehlgeschlagen', err);
      setStatus({ status: 'offline', message: 'Der geteilte Ordner ist gerade nicht erreichbar. Änderungen werden nachgeholt.' });
    }
  } finally {
    s.running = false;
    if (s.again && !s.stopped) {
      s.again = false;
      void runSync(s);
    }
  }
}

function stopSession(s: Session) {
  s.stopped = true;
  window.clearInterval(s.pollTimer);
  window.clearTimeout(s.flushTimer);
  s.offChange();
  s.engine.stop();
  void s.api.unwatch(s.folder).catch(() => undefined);
}

async function connect(projectId: string, config: ShareConfig): Promise<void> {
  const api = desktopShare();
  if (!api) return;
  setStatus({ projectId, folder: config.folder, userName: config.userName, status: 'connecting', message: null, lastSync: null });
  const state = await loadSyncState<SyncState>(projectId);
  const clientId = await getClientId();
  if (useStore.getState().project?.id !== projectId) {
    setStatus({ projectId: null, folder: null, status: 'off' }); // inzwischen anderes Projekt geöffnet
    return;
  }
  const engine = new SyncEngine(makeFs(api, config.folder), host, { clientId, userName: config.userName }, state);
  const s: Session = {
    api,
    engine,
    projectId,
    folder: config.folder,
    pollTimer: 0,
    flushTimer: undefined,
    offChange: () => undefined,
    running: false,
    again: false,
    stopped: false,
  };
  session = s;
  s.offChange = api.onChange(() => void runSync(s));
  s.pollTimer = window.setInterval(() => void runSync(s), POLL_MS);
  await api.watch(config.folder).catch(() => false);
  await runSync(s);
}

async function disconnect(): Promise<void> {
  const s = session;
  if (!s) return;
  session = null;
  window.clearTimeout(s.flushTimer);
  try {
    await s.engine.flush();
  } catch {
    // wird beim nächsten Verbinden nachgeholt
  }
  stopSession(s);
  await saveSyncState(s.projectId, s.engine.state).catch(() => undefined);
  setStatus({ projectId: null, folder: null, status: 'off', message: null, lastSync: null });
}

async function switchTo(projectId: string | null) {
  const run = async () => {
    await disconnect();
    if (!projectId || !desktopShare()) return;
    const config = await loadShareConfig(projectId);
    if (config && useStore.getState().project?.id === projectId) await connect(projectId, config);
  };
  connecting = (connecting ?? Promise.resolve()).then(run, run);
  await connecting;
}

/** Beim Start aufrufen: verbindet geteilte Projekte automatisch, sobald sie geöffnet werden. */
export function startShareController() {
  setExtraSaveProvider((projectId) => (session && session.projectId === projectId ? [[`sync:${projectId}`, session.engine.state]] : []));
  let currentId = useStore.getState().project?.id ?? null;
  void switchTo(currentId);
  useStore.subscribe((state, prev) => {
    const id = state.project?.id ?? null;
    if (id !== currentId) {
      currentId = id;
      void switchTo(id);
      return;
    }
    const s = session;
    if (!s || !state.project || state.project === prev.project) return;
    if (s.engine.noteLocalChange(state.project)) {
      window.clearTimeout(s.flushTimer);
      s.flushTimer = window.setTimeout(() => void runSync(s), FLUSH_DELAY_MS);
    }
  });
  window.addEventListener('beforeunload', () => {
    if (session) void session.engine.flush();
  });
}

/** Stellt sicher, dass das Projekt verbunden ist (auch wenn sich die Projekt-ID nicht geändert hat). */
async function ensureConnected(projectId: string) {
  await connecting;
  if (session?.projectId !== projectId) await switchTo(projectId);
}

/* ------------------------------------------------------------------ Aktionen für die Oberfläche */

function requireApi(): DesktopShareApi {
  const api = desktopShare();
  if (!api) throw new Error('Teilen funktioniert nur im Windows-Programm (NexoBuilder.exe).');
  return api;
}

export async function defaultUserName(): Promise<string> {
  const api = desktopShare();
  return (api ? await api.userName().catch(() => '') : '') || '';
}

/** Teilt das geöffnete Projekt über einen Ordner. Gibt den verwendeten Ordner zurück (null = abgebrochen). */
export async function shareCurrentProject(userName: string): Promise<string | null> {
  const api = requireApi();
  const project = useStore.getState().project;
  if (!project) return null;
  const chosen = await api.chooseFolder('share');
  if (!chosen) return null;
  let folder = chosen;
  const info = await api.inspect(chosen);
  if (info.project) {
    if (info.project.id !== project.id) {
      throw new Error(
        `In diesem Ordner liegt schon das geteilte Projekt „${info.project.name}“. Wähle einen anderen Ordner oder öffne es über „Geteiltes Projekt öffnen“.`,
      );
    }
  } else {
    const same = info.children.find((c) => c.projectId === project.id);
    if (same) folder = same.path;
    else if (!info.empty) folder = await api.createSubfolder(chosen, project.name || 'NexoBuilder-Projekt');
  }
  await api.write(folder, README_FILE, README_TEXT);
  await saveShareConfig(project.id, { folder, userName: userName.trim() || 'Unbekannt' });
  await switchTo(project.id);
  return folder;
}

/** Öffnet ein geteiltes Projekt aus einem Ordner (z.B. von Freunden). Gibt den Projektnamen zurück. */
export async function openSharedProject(): Promise<string | null> {
  const api = requireApi();
  const chosen = await api.chooseFolder('join');
  if (!chosen) return null;
  let folder = chosen;
  const info = await api.inspect(chosen);
  if (!info.project) {
    if (info.children.length === 1) folder = info.children[0].path;
    else if (info.children.length > 1) {
      throw new Error(
        `In diesem Ordner liegen mehrere geteilte Projekte (${info.children.map((c) => c.projectName || c.name).join(', ')}). Bitte direkt den Ordner des Projekts wählen.`,
      );
    } else {
      throw new Error('In diesem Ordner liegt kein geteiltes NexoBuilder-Projekt (project.json fehlt).');
    }
  }
  const shared = await readShareFolder(makeFs(api, folder));
  if (!shared) throw new Error('Das geteilte Projekt konnte nicht gelesen werden. Ist der Ordner schon vollständig heruntergeladen?');
  const projectId = shared.project.id;
  await flushNow();
  const existing = await loadShareConfig(projectId);
  if (existing?.folder === folder && (await loadProject(projectId))) {
    // Schon einmal geöffnet – einfach wieder verbinden
    const project = await loadProject(projectId);
    useStore.getState().setProject(project);
    await ensureConnected(projectId);
    return project?.name ?? shared.project.name;
  }
  const userName = existing?.userName || (await defaultUserName()) || 'Unbekannt';
  const project: Project = migrateProject(deepClone(shared.project));
  await saveProject(project, [[`sync:${projectId}`, shared.state]]);
  await saveShareConfig(projectId, { folder, userName });
  useStore.getState().setProject(project);
  await ensureConnected(projectId);
  return project.name;
}

/** Beendet das Teilen. Die eigene Kopie und der Ordner bleiben erhalten. */
export async function stopSharing(): Promise<void> {
  const projectId = useStore.getState().project?.id;
  await disconnect();
  if (!projectId) return;
  await saveShareConfig(projectId, null);
  await saveSyncState(projectId, null);
}

export async function setShareUserName(userName: string): Promise<void> {
  const name = userName.trim() || 'Unbekannt';
  const s = session;
  if (!s) return;
  s.engine.setUserName(name);
  const config = await loadShareConfig(s.projectId);
  if (config) await saveShareConfig(s.projectId, { ...config, userName: name });
  setStatus({ userName: name });
}

export function openShareFolder() {
  const { folder } = useShareStore.getState();
  if (folder) void desktopShare()?.openFolder(folder);
}

/** Sofort nachsehen (Knopf „Jetzt abgleichen“) */
export function syncNow() {
  if (session) void runSync(session);
}
