/**
 * File format for shared projects.
 *
 * A shared project lives in a normal folder (e.g. in OneDrive, Google Drive or Dropbox).
 * Each item, folder and glyph is its own small file – so two people only overwrite
 * each other if they change exactly the same item at the same time.
 *
 *   project.json          project data (name, namespace, settings, orderings)
 *   folders/<id>.json     a folder
 *   items/<id>.json       an item (incl. model and textures)
 *   glyphs/<id>.json      a glyph
 *   sounds/<id>.json      a sound (incl. OGG files)
 *   paintings/<id>.json   a painting (incl. image)
 *
 * Each file is an "envelope" with a version number (rev) and sender. Deleted entries remain as
 * a small tombstone (deleted: true) so that the deletion reaches everyone.
 */
import type { Folder, Item, Project, ProjectSettings } from '../types';
import type { Glyph } from '../nexo/glyphs';
import type { Sound } from '../nexo/sounds';
import type { Painting } from '../nexo/paintings';
import { isPlainObject } from '../util';

export const SHARE_FORMAT = 'resourcepackbuilder-share';
export const SHARE_VERSION = 1;
export const PROJECT_FILE = 'project.json';
export const README_FILE = 'LIESMICH.txt';

export type EntityKind = 'project' | 'folder' | 'item' | ListKind;

/** Project lists whose entries get their own file (order is stored in project.json) */
export type ListKind = 'glyph' | 'sound' | 'painting';
type ListEntry = Glyph | Sound | Painting;

export const LIST_KINDS: Record<ListKind, { field: 'glyphs' | 'sounds' | 'paintings'; order: 'glyphOrder' | 'soundOrder' | 'paintingOrder'; label: string }> = {
  glyph: { field: 'glyphs', order: 'glyphOrder', label: 'glyphId' },
  sound: { field: 'sounds', order: 'soundOrder', label: 'soundId' },
  painting: { field: 'paintings', order: 'paintingOrder', label: 'paintingId' },
};
export const LIST_KIND_NAMES = Object.keys(LIST_KINDS) as ListKind[];

export function listOf(project: Project, kind: ListKind): ListEntry[] {
  return (project[LIST_KINDS[kind].field] ?? []) as ListEntry[];
}

const DIRS = { folder: 'folders', item: 'items', glyph: 'glyphs', sound: 'sounds', painting: 'paintings' } as const;
const KIND_BY_DIR: Record<string, EntityKind> = { folders: 'folder', items: 'item', glyphs: 'glyph', sounds: 'sound', paintings: 'painting' };

/** Allowed IDs for file names (everything ResourcepackBuilder generates itself). */
export const ENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ENTITY_PATH_PATTERN = /^(folders|items|glyphs|sounds|paintings)\/([A-Za-z0-9_-]{1,64})\.json$/;

/** Project-wide data without items/folders/glyphs (and without updatedAt, which changes on every edit). */
export interface ProjectMeta {
  formatVersion: 1;
  id: string;
  name: string;
  namespace: string;
  settings: ProjectSettings;
  rootFolderIds: string[];
  glyphOrder: string[];
  /** Since 1.4 – older versions know no sounds/paintings */
  soundOrder?: string[];
  paintingOrder?: string[];
  createdAt: number;
}

export type EntityData = ProjectMeta | Folder | Item | ListEntry;

export interface Envelope {
  format: typeof SHARE_FORMAT;
  version: number;
  kind: EntityKind;
  id: string;
  /** Logical clock: higher values are newer */
  rev: number;
  /** Installation that wrote it (tie-breaker) */
  by: string;
  /** Display name of the person */
  byName: string;
  deleted?: true;
  data?: EntityData;
}

export interface EntityRef {
  kind: EntityKind;
  id: string;
}

export function entityKey(kind: EntityKind, id: string): string {
  return kind === 'project' ? 'project' : `${kind}:${id}`;
}

export function parseEntityKey(key: string): EntityRef {
  if (key === 'project') return { kind: 'project', id: '' };
  const index = key.indexOf(':');
  return { kind: key.slice(0, index) as EntityKind, id: key.slice(index + 1) };
}

export function entityPath(kind: EntityKind, id: string): string {
  return kind === 'project' ? PROJECT_FILE : `${DIRS[kind]}/${id}.json`;
}

/** Maps a file path to an entry – conflict copies ("item (1).json") and foreign files yield null. */
export function parseEntityPath(path: string): EntityRef | null {
  if (path === PROJECT_FILE) return { kind: 'project', id: '' };
  const match = ENTITY_PATH_PATTERN.exec(path);
  return match ? { kind: KIND_BY_DIR[match[1]], id: match[2] } : null;
}

export function projectMeta(project: Project): ProjectMeta {
  return {
    formatVersion: 1,
    id: project.id,
    name: project.name,
    namespace: project.namespace,
    settings: project.settings,
    rootFolderIds: project.rootFolderIds,
    glyphOrder: project.glyphs.map((g) => g.id),
    soundOrder: (project.sounds ?? []).map((g) => g.id),
    paintingOrder: (project.paintings ?? []).map((g) => g.id),
    createdAt: project.createdAt,
  };
}

/** Returns the local state of an entry (undefined = does not exist or deleted). */
export function localEntity(project: Project, key: string): EntityData | undefined {
  const { kind, id } = parseEntityKey(key);
  switch (kind) {
    case 'project':
      return projectMeta(project);
    case 'folder':
      return project.folders[id];
    case 'item':
      return project.items[id];
    default:
      return listOf(project, kind).find((g) => g.id === id);
  }
}

/** All entries of a project as keys (only IDs that are usable as file names). */
export function entityKeys(project: Project): string[] {
  const keys = ['project'];
  for (const id of Object.keys(project.folders)) if (ENTITY_ID_PATTERN.test(id)) keys.push(entityKey('folder', id));
  for (const id of Object.keys(project.items)) if (ENTITY_ID_PATTERN.test(id)) keys.push(entityKey('item', id));
  for (const kind of LIST_KIND_NAMES) {
    for (const entry of listOf(project, kind)) if (ENTITY_ID_PATTERN.test(entry.id)) keys.push(entityKey(kind, entry.id));
  }
  return keys;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * Which entries changed between two project states?
 * Relies on Immer reusing unchanged objects – only references are compared.
 */
export function changedEntityKeys(prev: Project, next: Project): string[] {
  const keys: string[] = [];
  const add = (key: string, id: string) => {
    if (ENTITY_ID_PATTERN.test(id)) keys.push(key);
  };
  if (
    prev.name !== next.name ||
    prev.namespace !== next.namespace ||
    prev.settings !== next.settings ||
    prev.createdAt !== next.createdAt ||
    !sameIds(prev.rootFolderIds, next.rootFolderIds) ||
    LIST_KIND_NAMES.some(
      (kind) =>
        !sameIds(
          listOf(prev, kind).map((g) => g.id),
          listOf(next, kind).map((g) => g.id),
        ),
    )
  ) {
    keys.push('project');
  }
  if (prev.folders !== next.folders) {
    for (const id of new Set([...Object.keys(prev.folders), ...Object.keys(next.folders)])) {
      if (prev.folders[id] !== next.folders[id]) add(entityKey('folder', id), id);
    }
  }
  if (prev.items !== next.items) {
    for (const id of new Set([...Object.keys(prev.items), ...Object.keys(next.items)])) {
      if (prev.items[id] !== next.items[id]) add(entityKey('item', id), id);
    }
  }
  for (const kind of LIST_KIND_NAMES) {
    const a = listOf(prev, kind);
    const b = listOf(next, kind);
    if (a === b) continue;
    const before = new Map(a.map((g) => [g.id, g]));
    const after = new Map(b.map((g) => [g.id, g]));
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      if (before.get(id) !== after.get(id)) add(entityKey(kind, id), id);
    }
  }
  return keys;
}

export function makeEnvelope(
  ref: EntityRef,
  version: { rev: number; by: string; byName: string },
  data: EntityData | undefined,
): Envelope {
  const envelope: Envelope = {
    format: SHARE_FORMAT,
    version: SHARE_VERSION,
    kind: ref.kind,
    id: ref.id,
    rev: version.rev,
    by: version.by,
    byName: version.byName,
  };
  if (data === undefined) envelope.deleted = true;
  else envelope.data = data;
  return envelope;
}

/** Reads an envelope and checks whether it matches the expected path. Incomplete files yield null. */
export function parseEnvelope(text: string, expected: EntityRef): Envelope | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(raw) || raw.format !== SHARE_FORMAT || typeof raw.version !== 'number') return null;
  if (raw.kind !== expected.kind || typeof raw.id !== 'string') return null;
  if (expected.kind !== 'project' && raw.id !== expected.id) return null;
  if (typeof raw.rev !== 'number' || !Number.isFinite(raw.rev) || typeof raw.by !== 'string') return null;
  const envelope = raw as unknown as Envelope;
  if (typeof envelope.byName !== 'string') envelope.byName = '';
  if (envelope.deleted) {
    delete envelope.data;
    return envelope;
  }
  if (!isPlainObject(envelope.data)) return null;
  if (!isValidData(envelope.kind, envelope.id, envelope.data)) return null;
  return envelope;
}

function isValidData(kind: EntityKind, id: string, data: Record<string, unknown>): boolean {
  switch (kind) {
    case 'project':
      return (
        data.id === id &&
        typeof data.name === 'string' &&
        typeof data.namespace === 'string' &&
        isPlainObject(data.settings) &&
        Array.isArray(data.rootFolderIds) &&
        Array.isArray(data.glyphOrder)
      );
    case 'folder':
      return (
        data.id === id &&
        typeof data.name === 'string' &&
        (data.parentId === null || typeof data.parentId === 'string') &&
        Array.isArray(data.folderIds) &&
        Array.isArray(data.itemIds)
      );
    case 'item':
      return data.id === id && typeof data.nexoId === 'string' && typeof data.folderId === 'string' && isPlainObject(data.config);
    case 'glyph':
      return data.id === id && typeof data.glyphId === 'string';
    case 'sound':
      return data.id === id && typeof data.soundId === 'string' && Array.isArray(data.files);
    case 'painting':
      return data.id === id && typeof data.paintingId === 'string';
  }
}

/** Fast, stable string hash (cyrb53) – to detect unchanged files. */
export function hashString(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ':' + text.length.toString(36);
}

export function hashData(data: EntityData | undefined): string {
  return data === undefined ? 'deleted' : hashString(JSON.stringify(data));
}

/** Written into the share folder for people browsing it (English – it is shared between users of any language). */
export const README_TEXT = `This folder contains a shared ResourcepackBuilder project.

To open it: start ResourcepackBuilder → "Open shared project" → choose this folder.
Everyone who has opened the folder sees the others' changes automatically.

Please do not edit, rename or delete the files here by hand.
`;
