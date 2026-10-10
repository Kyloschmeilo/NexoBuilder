/**
 * Dateiformat für geteilte Projekte.
 *
 * Ein geteiltes Projekt liegt in einem normalen Ordner (z.B. in OneDrive, Google Drive oder Dropbox).
 * Jedes Item, jeder Ordner und jede Glyphe ist eine eigene kleine Datei – so überschreiben sich zwei
 * Personen nur dann gegenseitig, wenn sie gleichzeitig genau dasselbe Item ändern.
 *
 *   project.json          Projektdaten (Name, Namespace, Einstellungen, Reihenfolgen)
 *   folders/<id>.json     ein Ordner
 *   items/<id>.json       ein Item (inkl. Modell und Texturen)
 *   glyphs/<id>.json      eine Glyphe
 *
 * Jede Datei ist ein „Umschlag“ mit Versionsnummer (rev) und Absender. Gelöschte Einträge bleiben als
 * kleiner Grabstein (deleted: true) liegen, damit das Löschen bei allen ankommt.
 */
import type { Folder, Item, Project, ProjectSettings } from '../types';
import type { Glyph } from '../nexo/glyphs';
import { isPlainObject } from '../util';

export const SHARE_FORMAT = 'nexobuilder-share';
export const SHARE_VERSION = 1;
export const PROJECT_FILE = 'project.json';
export const README_FILE = 'LIESMICH.txt';

export type EntityKind = 'project' | 'folder' | 'item' | 'glyph';

const DIRS = { folder: 'folders', item: 'items', glyph: 'glyphs' } as const;
const KIND_BY_DIR: Record<string, EntityKind> = { folders: 'folder', items: 'item', glyphs: 'glyph' };

/** Erlaubte IDs für Dateinamen (alles, was NexoBuilder selbst erzeugt). */
export const ENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ENTITY_PATH_PATTERN = /^(folders|items|glyphs)\/([A-Za-z0-9_-]{1,64})\.json$/;

/** Projektweite Daten ohne Items/Ordner/Glyphen (und ohne updatedAt, das sich bei jeder Änderung ändert). */
export interface ProjectMeta {
  formatVersion: 1;
  id: string;
  name: string;
  namespace: string;
  settings: ProjectSettings;
  rootFolderIds: string[];
  glyphOrder: string[];
  createdAt: number;
}

export type EntityData = ProjectMeta | Folder | Item | Glyph;

export interface Envelope {
  format: typeof SHARE_FORMAT;
  version: number;
  kind: EntityKind;
  id: string;
  /** Logische Uhr: höhere Werte sind neuer */
  rev: number;
  /** Installation, die geschrieben hat (Gleichstand-Entscheider) */
  by: string;
  /** Anzeigename der Person */
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

/** Ordnet einen Dateipfad einem Eintrag zu – Konfliktkopien („item (1).json“) und fremde Dateien ergeben null. */
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
    createdAt: project.createdAt,
  };
}

/** Liefert den lokalen Stand eines Eintrags (undefined = gibt es nicht bzw. gelöscht). */
export function localEntity(project: Project, key: string): EntityData | undefined {
  const { kind, id } = parseEntityKey(key);
  switch (kind) {
    case 'project':
      return projectMeta(project);
    case 'folder':
      return project.folders[id];
    case 'item':
      return project.items[id];
    case 'glyph':
      return project.glyphs.find((g) => g.id === id);
  }
}

/** Alle Einträge eines Projekts als Schlüssel (nur IDs, die als Dateiname taugen). */
export function entityKeys(project: Project): string[] {
  const keys = ['project'];
  for (const id of Object.keys(project.folders)) if (ENTITY_ID_PATTERN.test(id)) keys.push(entityKey('folder', id));
  for (const id of Object.keys(project.items)) if (ENTITY_ID_PATTERN.test(id)) keys.push(entityKey('item', id));
  for (const glyph of project.glyphs) if (ENTITY_ID_PATTERN.test(glyph.id)) keys.push(entityKey('glyph', glyph.id));
  return keys;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * Welche Einträge haben sich zwischen zwei Projektständen geändert?
 * Nutzt aus, dass Immer unveränderte Objekte wiederverwendet – es werden nur Referenzen verglichen.
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
    !sameIds(
      prev.glyphs.map((g) => g.id),
      next.glyphs.map((g) => g.id),
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
  if (prev.glyphs !== next.glyphs) {
    const before = new Map(prev.glyphs.map((g) => [g.id, g]));
    const after = new Map(next.glyphs.map((g) => [g.id, g]));
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      if (before.get(id) !== after.get(id)) add(entityKey('glyph', id), id);
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

/** Liest einen Umschlag und prüft, ob er zum erwarteten Pfad passt. Unvollständige Dateien ergeben null. */
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
  }
}

/** Schneller, stabiler String-Hash (cyrb53) – um unveränderte Dateien zu erkennen. */
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

export const README_TEXT = `Dieser Ordner enthält ein geteiltes NexoBuilder-Projekt.

Öffnen: NexoBuilder starten → „Geteiltes Projekt öffnen“ → diesen Ordner wählen.
Alle, die den Ordner geöffnet haben, sehen Änderungen der anderen automatisch.

Bitte die Dateien hier nicht von Hand ändern, umbenennen oder löschen.
`;
