/**
 * Speichert Projekte automatisch im Browser (IndexedDB) und erlaubt das Speichern/Öffnen
 * als Projektdatei (.nexobuilder.json) zur Sicherung oder Weitergabe.
 */
import { createStore, del, get, set } from 'idb-keyval';
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

export async function saveProject(project: Project): Promise<void> {
  if (!db) throw new Error('IndexedDB ist nicht verfügbar');
  await set(`project:${project.id}`, project, db);
  const index = ((await get(INDEX_KEY, db)) as ProjectSummary[] | undefined) ?? [];
  const summary: ProjectSummary = {
    id: project.id,
    name: project.name,
    namespace: project.namespace,
    itemCount: Object.keys(project.items).length,
    updatedAt: project.updatedAt,
  };
  const next = [summary, ...index.filter((p) => p.id !== project.id)];
  await set(INDEX_KEY, next, db);
  await set(LAST_KEY, project.id, db);
}

export async function deleteStoredProject(id: string): Promise<void> {
  if (!db) return;
  await del(`project:${id}`, db);
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
  for (const folder of Object.values(project.folders)) {
    folder.folderIds = Array.isArray(folder.folderIds) ? folder.folderIds : [];
    folder.itemIds = Array.isArray(folder.itemIds) ? folder.itemIds.filter((id) => project.items[id]) : [];
  }
  for (const item of Object.values(project.items) as Item[]) {
    item.config = isPlainObject(item.config) ? item.config : {};
    item.rawYaml = typeof item.rawYaml === 'string' ? item.rawYaml : '';
    item.assets = isPlainObject(item.assets) ? item.assets : {};
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
let warned = false;

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
  if (!project || project === lastSaved) return;
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
