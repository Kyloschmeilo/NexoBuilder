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
import { z } from 'zod';
import {
  type Fits,
  jsonOrNull,
  lenientString,
  listOf,
  optional,
  parseJson,
  plainObject,
  sameList,
  type SchemaChecks,
  withoutUndefined,
} from '@resourcepackbuilder/utils';
import {
  MEDIA_KIND_LIST,
  MEDIA_KINDS,
  mediaList,
  type MediaEntryByKind,
  type MediaKind,
} from '@resourcepackbuilder/core/project/media/kinds';
import { FolderSchema, MEDIA_SCHEMAS, parseItem, settingsSchema } from '@resourcepackbuilder/core/project/schema';
import type { Folder, Item, Project, ProjectSettings } from '@resourcepackbuilder/core/project/types';

export const SHARE_FORMAT = 'resourcepackbuilder-share';
const SHARE_VERSION = 1;
export const PROJECT_FILE = 'project.json';
/** Informational file for people browsing the folder (never read) */
export const README_FILE = 'README.txt';

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
  /** Missing in damaged files – the project keeps its own then */
  createdAt?: number;
}

/** What each kind of entry stores; glyphs, sounds and paintings (see MEDIA_KINDS) each get their own file too. */
interface EntityDataByKind extends MediaEntryByKind {
  project: ProjectMeta;
  folder: Folder;
  item: Item;
}

export type EntityKind = keyof EntityDataByKind;
type FileKind = Exclude<EntityKind, 'project'>;
export type EntityData = EntityDataByKind[EntityKind];

/** Folder of each kind of file (the media lists use their project field, e.g. glyphs/) */
const DIRS: Record<FileKind, string> = {
  folder: 'folders',
  item: 'items',
  glyph: MEDIA_KINDS.glyph.list,
  sound: MEDIA_KINDS.sound.list,
  painting: MEDIA_KINDS.painting.list,
};
const KIND_BY_DIR = new Map(Object.entries(DIRS).map(([kind, dir]) => [dir, kind as FileKind]));

/** Allowed IDs for file names (everything ResourcepackBuilder generates itself). */
const ENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ENTITY_PATH_PATTERN = /^([a-z]+)\/([A-Za-z0-9_-]{1,64})\.json$/;

/** Folders holding one file per entry (`items/<id>.json` …). */
export const ENTITY_DIRS: readonly string[] = Object.values(DIRS);

/** Whether `path` (relative, forward slashes) is a file a shared project folder may contain. */
export function isShareFilePath(path: string): boolean {
  return path === README_FILE || parseEntityPath(path) !== null;
}

/**
 * Id and name of the shared project in the text of a `project.json`, or null when it is none. Lenient on purpose
 * (only format and id are required): it identifies a folder, the sync engine checks the full envelope.
 */
export function readProjectInfo(text: string): { id: string; name: string } | null {
  const info = jsonOrNull(parseJson(text, ProjectInfoSchema));
  return info && info.data;
}

const ProjectInfoSchema = z.object({
  format: z.literal(SHARE_FORMAT),
  data: z.object({ id: z.string(), name: lenientString() }),
});

type EnvelopeOf<K extends EntityKind> = {
  format: typeof SHARE_FORMAT;
  version: number;
  kind: K;
  id: string;
  /** Logical clock: higher values are newer */
  rev: number;
  /** Installation that wrote it (tie-breaker) */
  by: string;
  /** Display name of the person */
  byName: string;
  deleted?: true;
  data?: EntityDataByKind[K];
};

export type Envelope = { [K in EntityKind]: EnvelopeOf<K> }[EntityKind];

/** An entry: the project itself (its ID comes from the project) or an entry with its own ID. */
export type EntityRef = { kind: 'project' } | { kind: FileKind; id: string };

/** Key of an entry in the sync state, e.g. "item:i_abc" or "project". */
export function entityKey(ref: EntityRef): string {
  return ref.kind === 'project' ? 'project' : `${ref.kind}:${ref.id}`;
}

function isFileKind(value: string): value is FileKind {
  // Own keys only: `in` would also accept inherited ones such as "constructor"
  return Object.hasOwn(DIRS, value);
}

export function parseEntityKey(key: string): EntityRef | null {
  if (key === 'project') return { kind: 'project' };
  const index = key.indexOf(':');
  const kind = key.slice(0, index);
  return index > 0 && isFileKind(kind) ? { kind, id: key.slice(index + 1) } : null;
}

export function entityPath(ref: EntityRef): string {
  return ref.kind === 'project' ? PROJECT_FILE : `${DIRS[ref.kind]}/${ref.id}.json`;
}

/** Maps a file path to an entry – conflict copies ("item (1).json") and foreign files yield null. */
export function parseEntityPath(path: string): EntityRef | null {
  if (path === PROJECT_FILE) return { kind: 'project' };
  const match = ENTITY_PATH_PATTERN.exec(path);
  const kind = match && KIND_BY_DIR.get(match[1]);
  return match && kind ? { kind, id: match[2] } : null;
}

function projectMeta(project: Project): ProjectMeta {
  return {
    formatVersion: 1,
    id: project.id,
    name: project.name,
    namespace: project.namespace,
    settings: project.settings,
    rootFolderIds: project.rootFolderIds,
    glyphOrder: project.glyphs.map((g) => g.id),
    soundOrder: project.sounds.map((g) => g.id),
    paintingOrder: project.paintings.map((g) => g.id),
    createdAt: project.createdAt,
  };
}

/** Returns the local state of an entry (undefined = does not exist or deleted). */
export function localEntity(project: Project, ref: EntityRef): EntityData | undefined {
  switch (ref.kind) {
    case 'project':
      return projectMeta(project);
    case 'folder':
      return project.folders[ref.id];
    case 'item':
      return project.items[ref.id];
    default:
      return mediaList(project, ref.kind).find((g) => g.id === ref.id);
  }
}

/** All entries of a project as keys (only IDs that are usable as file names). */
export function entityKeys(project: Project): string[] {
  const keys = ['project'];
  const add = (kind: FileKind, id: string) => {
    if (ENTITY_ID_PATTERN.test(id)) keys.push(entityKey({ kind, id }));
  };
  for (const id of Object.keys(project.folders)) add('folder', id);
  for (const id of Object.keys(project.items)) add('item', id);
  for (const kind of MEDIA_KIND_LIST) for (const entry of mediaList(project, kind)) add(kind, entry.id);
  return keys;
}

/**
 * Which entries changed between two project states?
 * Relies on Immer reusing unchanged objects – only references are compared.
 */
export function changedEntityKeys(prev: Project, next: Project): string[] {
  const keys: string[] = [];
  const add = (kind: FileKind, id: string) => {
    if (ENTITY_ID_PATTERN.test(id)) keys.push(entityKey({ kind, id }));
  };
  if (
    prev.name !== next.name ||
    prev.namespace !== next.namespace ||
    prev.settings !== next.settings ||
    prev.createdAt !== next.createdAt ||
    !sameList(prev.rootFolderIds, next.rootFolderIds) ||
    MEDIA_KIND_LIST.some((kind) => !sameList<{ id: string }>(mediaList(prev, kind), mediaList(next, kind), (e) => e.id))
  ) {
    keys.push('project');
  }
  if (prev.folders !== next.folders) {
    for (const id of new Set([...Object.keys(prev.folders), ...Object.keys(next.folders)])) {
      if (prev.folders[id] !== next.folders[id]) add('folder', id);
    }
  }
  if (prev.items !== next.items) {
    for (const id of new Set([...Object.keys(prev.items), ...Object.keys(next.items)])) {
      if (prev.items[id] !== next.items[id]) add('item', id);
    }
  }
  for (const kind of MEDIA_KIND_LIST) {
    const a: MediaEntryByKind[MediaKind][] = mediaList(prev, kind);
    const b: MediaEntryByKind[MediaKind][] = mediaList(next, kind);
    if (a === b) continue;
    const before = new Map(a.map((g) => [g.id, g]));
    const after = new Map(b.map((g) => [g.id, g]));
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      if (before.get(id) !== after.get(id)) add(kind, id);
    }
  }
  return keys;
}

/** An envelope as written: the kind of `data` is the one of the entry (see {@link Envelope} for read ones). */
export type OutgoingEnvelope = EnvelopeOf<EntityKind>;

export function createEnvelope(
  ref: EntityRef,
  projectId: string,
  version: { rev: number; by: string; byName: string },
  data: EntityData | undefined,
): OutgoingEnvelope {
  const envelope: OutgoingEnvelope = {
    format: SHARE_FORMAT,
    version: SHARE_VERSION,
    kind: ref.kind,
    id: ref.kind === 'project' ? projectId : ref.id,
    rev: version.rev,
    by: version.by,
    byName: version.byName,
  };
  if (data === undefined) envelope.deleted = true;
  else envelope.data = data;
  return envelope;
}

/* ------------------------------------------------------------ Reading envelopes (written by other installations: untrusted) */

/** Project data of a project.json; the settings go through the same lenient schema as stored projects. */
const ProjectMetaSchema = z
  .object({
    formatVersion: z.literal(1).catch(1),
    id: z.string(),
    name: z.string(),
    namespace: z.string(),
    settings: plainObject(),
    rootFolderIds: listOf(z.string()),
    glyphOrder: listOf(z.string()),
    soundOrder: optional(listOf(z.string())),
    paintingOrder: optional(listOf(z.string())),
    createdAt: optional(z.number()),
  })
  .transform((meta): ProjectMeta => withoutUndefined({ ...meta, settings: settingsSchema(meta.name).parse(meta.settings) }));

/** Item data: the fields every complete item file has, then the project migration. */
const ItemDataSchema = z.looseObject({ nexoId: z.string(), folderId: z.string(), config: plainObject() }).transform((raw, ctx) => {
  const item = parseItem(raw, Date.now());
  if (item) return item;
  ctx.addIssue({ code: 'custom', message: 'no item' });
  return z.NEVER;
});

/** An envelope of `kind`: a tombstone (`deleted`) or the entry's data, whose id must be the envelope's. */
function envelopeSchema<K extends EntityKind>(kind: K, data: z.ZodType<EntityDataByKind[K], unknown>) {
  return z
    .object({
      format: z.literal(SHARE_FORMAT),
      version: z.number(),
      kind: z.literal(kind),
      id: z.string(),
      rev: z.number(),
      by: z.string(),
      byName: lenientString(),
      deleted: z.unknown().optional(),
      data: z.unknown().optional(),
    })
    .transform(({ deleted, data: raw, ...head }, ctx): EnvelopeOf<K> => {
      if (deleted) return { ...head, deleted: true };
      const parsed = data.safeParse(raw);
      if (parsed.success && parsed.data.id === head.id) return { ...head, data: parsed.data };
      ctx.addIssue({ code: 'custom', message: 'invalid data', path: ['data'] });
      return z.NEVER;
    });
}

/** Every envelope, told apart by `kind`; the media kinds use their schemas from MEDIA_SCHEMAS. */
const EnvelopeSchema = z.discriminatedUnion('kind', [
  envelopeSchema('project', ProjectMetaSchema),
  envelopeSchema('folder', FolderSchema),
  envelopeSchema('item', ItemDataSchema),
  envelopeSchema('glyph', MEDIA_SCHEMAS.glyph),
  envelopeSchema('sound', MEDIA_SCHEMAS.sound),
  envelopeSchema('painting', MEDIA_SCHEMAS.painting),
]);

/** Reads an envelope and checks whether it matches the expected path. Incomplete or invalid files yield null. */
export function parseEnvelope(text: string, expected: EntityRef): Envelope | null {
  const env = jsonOrNull(parseJson(text, EnvelopeSchema));
  if (!env || env.kind !== expected.kind) return null;
  return expected.kind === 'project' || env.id === expected.id ? env : null;
}

export type FormatSchemaChecks = SchemaChecks<
  [Fits<z.output<typeof EnvelopeSchema>, Envelope>, Fits<z.output<typeof FolderSchema>, Folder>]
>;

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
