/**
 * Speichert Projekte automatisch im Browser (IndexedDB) und erlaubt das Speichern/Öffnen
 * als Projektdatei (.nexobuilder.json) zur Sicherung oder Weitergabe.
 */
import { createStore, del, get, keys, set, setMany } from 'idb-keyval';
import type { Item, Project } from '../core/types';
import { defaultSettings } from '../core/project/factory';
import { isPlainObject, uid } from '../core/util';
import { useStore } from './store';

export interface ProjectSummary {
  id: string;
  name: string;
  namespace: string;
  itemCount: number;
  updatedAt: number;
}

const db = typeof indexedDB !== 'undefined' ? createStore('nexobuilder', 'projects') : null;
const INDEX_KEY = 'index';
const LAST_KEY = 'last-project';
export const PROJECT_FILE_EXTENSION = '.nexobuilder.json';

export function isStorageAvailable(): boolean {
  return db !== null;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  if (!db) return [];
  const index = ((await get(INDEX_KEY, db)) as ProjectSummary[] | undefined) ?? [];
  return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadProject(id: string): Promise<Project | null> {
  if (!db) return null;
  const raw = await get(`project:${id}`, db);
  return raw ? migrateProject(raw) : null;
}

/** Zusätzliche Daten, die zusammen mit dem Projekt gespeichert werden müssen (z.B. Abgleich-Stand) */
type ExtraSaveProvider = (projectId: string) => Array<[string, unknown]>;
let extraSaveProvider: ExtraSaveProvider | null = null;

export function setExtraSaveProvider(provider: ExtraSaveProvider | null) {
  extraSaveProvider = provider;
}

/** Speichert Projekt und Zusatzdaten in einem Schritt – beides passt danach immer zusammen. */
export async function saveProject(project: Project, extra: Array<[string, unknown]> = extraSaveProvider?.(project.id) ?? []): Promise<void> {
  if (!db) throw new Error('IndexedDB ist nicht verfügbar');
  const index = ((await get(INDEX_KEY, db)) as ProjectSummary[] | undefined) ?? [];
  const summary: ProjectSummary = {
    id: project.id,
    name: project.name,
    namespace: project.namespace,
    itemCount: Object.keys(project.items).length,
    updatedAt: project.updatedAt,
  };
  const next = [summary, ...index.filter((p) => p.id !== project.id)];
  await setMany(
    [[`project:${project.id}`, project], ...extra, [INDEX_KEY, next], [LAST_KEY, project.id]],
    db,
  );
}

export async function deleteStoredProject(id: string): Promise<void> {
  if (!db) return;
  await del(`project:${id}`, db);
  await del(`share:${id}`, db);
  await del(`sync:${id}`, db);
  const index = ((await get(INDEX_KEY, db)) as ProjectSummary[] | undefined) ?? [];
  await set(
    INDEX_KEY,
    index.filter((p) => p.id !== id),
    db,
  );
}

export async function getLastProjectId(): Promise<string | null> {
  if (!db) return null;
  return ((await get(LAST_KEY, db)) as string | undefined) ?? null;
}

export async function clearLastProjectId(): Promise<void> {
  if (db) await del(LAST_KEY, db);
}

/* ------------------------------------------------------------------ Geteilte Projekte */

export interface ShareConfig {
  /** Geteilter Ordner auf diesem Rechner */
  folder: string;
  /** Name, den die anderen bei Änderungen sehen */
  userName: string;
}

export async function loadShareConfig(projectId: string): Promise<ShareConfig | null> {
  if (!db) return null;
  return ((await get(`share:${projectId}`, db)) as ShareConfig | undefined) ?? null;
}

export async function saveShareConfig(projectId: string, config: ShareConfig | null): Promise<void> {
  if (!db) throw new Error('IndexedDB ist nicht verfügbar');
  if (config) await set(`share:${projectId}`, config, db);
  else await del(`share:${projectId}`, db);
}

export async function listSharedProjectIds(): Promise<Set<string>> {
  if (!db) return new Set();
  const all = (await keys(db)) as string[];
  return new Set(all.filter((k) => typeof k === 'string' && k.startsWith('share:')).map((k) => k.slice(6)));
}

export async function loadSyncState<T>(projectId: string): Promise<T | null> {
  if (!db) return null;
  return ((await get(`sync:${projectId}`, db)) as T | undefined) ?? null;
}

export async function saveSyncState(projectId: string, state: unknown | null): Promise<void> {
  if (!db) return;
  if (state) await set(`sync:${projectId}`, state, db);
  else await del(`sync:${projectId}`, db);
}

/** Zufällige, feste ID dieser Installation (unterscheidet gleichzeitige Änderungen) */
export async function getClientId(): Promise<string> {
  if (!db) return uid('c_');
  const existing = (await get('client-id', db)) as string | undefined;
  if (existing) return existing;
  const id = uid('c_');
  await set('client-id', id, db);
  return id;
}

/* ------------------------------------------------------------------ Projektdatei */

export function serializeProject(project: Project): string {
  return JSON.stringify({ app: 'NexoBuilder', formatVersion: 1, project }, null, 1);
}

export function parseProjectFile(text: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist keine gültige NexoBuilder-Projektdatei.');
  }
  if (!isPlainObject(data) || data.app !== 'NexoBuilder' || !isPlainObject(data.project)) {
    throw new Error('Die Datei ist keine NexoBuilder-Projektdatei.');
  }
  return migrateProject(data.project);
}

/** Stellt sicher, dass ältere oder unvollständige Projekte alle Felder besitzen. */
export function migrateProject(raw: unknown): Project {
  if (!isPlainObject(raw)) throw new Error('Ungültiges Projekt');
  const project = raw as unknown as Project;
  if (typeof project.name !== 'string') throw new Error('Ungültiges Projekt (Name fehlt)');
  project.formatVersion = 1;
  project.id = typeof project.id === 'string' ? project.id : uid('p_');
  project.namespace = typeof project.namespace === 'string' ? project.namespace : 'nexobuilder';
  project.settings = { ...defaultSettings(project.name), ...(isPlainObject(project.settings) ? project.settings : {}) };
  project.folders = isPlainObject(project.folders) ? project.folders : {};
  project.items = isPlainObject(project.items) ? project.items : {};
  project.rootFolderIds = Array.isArray(project.rootFolderIds) ? project.rootFolderIds : [];
  project.glyphs = Array.isArray(project.glyphs) ? project.glyphs : [];
  for (const folder of Object.values(project.folders)) {
    folder.folderIds = Array.isArray(folder.folderIds) ? folder.folderIds : [];
    folder.itemIds = Array.isArray(folder.itemIds) ? folder.itemIds.filter((id) => project.items[id]) : [];
  }
  for (const item of Object.values(project.items) as Item[]) {
    item.config = isPlainObject(item.config) ? item.config : {};
    item.rawYaml = typeof item.rawYaml === 'string' ? item.rawYaml : '';
    item.assets = isPlainObject(item.assets) ? item.assets : {};
    item.recipes = Array.isArray(item.recipes) ? item.recipes : [];
    item.model = item.model ?? null;
    item.displayName = typeof item.displayName === 'string' ? item.displayName : '';
  }
  project.createdAt = typeof project.createdAt === 'number' ? project.createdAt : Date.now();
  project.updatedAt = typeof project.updatedAt === 'number' ? project.updatedAt : Date.now();
  return project;
}

/* ------------------------------------------------------------------ Automatisches Speichern */

let timer: number | undefined;
let lastSaved: Project | null = null;
let extraDirty = false;
let warned = false;

/** Speichern anstoßen, obwohl sich das Projekt nicht geändert hat (z.B. neuer Abgleich-Stand) */
export function requestSave() {
  extraDirty = true;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void flush(), 600);
}

export function startAutosave() {
  useStore.subscribe((state, prev) => {
    if (state.project === prev.project || !state.project) return;
    if (state.project === lastSaved) return;
    useStore.getState().setSaveStatus('saving');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void flush(), 600);
  });
  window.addEventListener('beforeunload', () => {
    void flush();
  });
}

async function flush() {
  const project = useStore.getState().project;
  if (!project || (project === lastSaved && !extraDirty)) {
    if (useStore.getState().saveStatus === 'saving') useStore.getState().setSaveStatus('saved');
    return;
  }
  extraDirty = false;
  try {
    await saveProject(project);
    lastSaved = project;
    useStore.getState().setSaveStatus('saved');
  } catch (err) {
    console.error(err);
    useStore.getState().setSaveStatus('error');
    if (!warned) {
      warned = true;
      useStore
        .getState()
        .toast('warning', 'Automatisches Speichern im Browser ist nicht möglich. Bitte das Projekt regelmäßig als Datei speichern.');
    }
  }
}

export async function flushNow() {
  window.clearTimeout(timer);
  await flush();
}
