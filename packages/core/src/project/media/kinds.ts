/**
 * The project lists of glyphs, sounds, paintings and dialogs. Everything that treats them alike (sync,
 * export selection, migration) iterates this registry instead of spelling out each kind.
 */
import { SOUND_ID_CHARS } from '@resourcepackbuilder/minecraft';
import type { PackTargetId } from '../target';
import type { Project } from '../types';
import { slugify, toIdentifier } from '@resourcepackbuilder/utils';
import { dialogKey, type Dialog } from './dialog';
import type { Glyph } from './glyph';
import type { Painting } from './painting';
import { soundEventKey, type Sound } from './sound';
import { mediaKey } from './entry';

export interface MediaEntryByKind {
  glyph: Glyph;
  sound: Sound;
  painting: Painting;
  dialog: Dialog;
}

export type MediaKind = keyof MediaEntryByKind;
export type MediaEntry = MediaEntryByKind[MediaKind];
export type MediaLists = Pick<Project, 'glyphs' | 'sounds' | 'paintings' | 'dialogs'>;

interface MediaKindInfo<K extends MediaKind> {
  /** Project field of the list; also the folder of the entries in a shared project */
  list: keyof MediaLists;
  /** Field with the user-facing ID */
  idField: keyof MediaEntryByKind[K] & string;
  /** Order field in project.json of a shared project */
  orderField: 'glyphOrder' | 'soundOrder' | 'paintingOrder' | 'dialogOrder';
  /** Key of the deselected IDs in an export selection */
  excludedKey: 'excludedGlyphIds' | 'excludedSoundIds' | 'excludedPaintingIds' | 'excludedDialogIds';
  /** The pack targets that read this kind; every target when absent */
  targets?: readonly PackTargetId[];
  /** ID that must be unique across all exported projects (glyph IDs have no namespace in Nexo) */
  globalId: (project: Pick<Project, 'namespace'>, entry: MediaEntryByKind[K]) => string;
  /** Prefix of the internal IDs of new entries */
  uidPrefix: string;
  /** The user-facing ID suggested for a name (e.g. a file name); not yet unique */
  idFromName: (name: string) => string;
}

export const MEDIA_KINDS: { [K in MediaKind]: MediaKindInfo<K> } = {
  glyph: {
    list: 'glyphs',
    idField: 'glyphId',
    orderField: 'glyphOrder',
    excludedKey: 'excludedGlyphIds',
    globalId: (_, glyph) => glyph.glyphId,
    uidPrefix: 'g_',
    idFromName: (name) => slugify(name, 'glyph'),
  },
  sound: {
    list: 'sounds',
    idField: 'soundId',
    orderField: 'soundOrder',
    excludedKey: 'excludedSoundIds',
    globalId: (project, sound) => soundEventKey(project, sound),
    uidPrefix: 's_',
    idFromName: (name) => toIdentifier(name, SOUND_ID_CHARS, 'sound'),
  },
  painting: {
    list: 'paintings',
    idField: 'paintingId',
    orderField: 'paintingOrder',
    excludedKey: 'excludedPaintingIds',
    globalId: (project, painting) => mediaKey(project, painting.paintingId),
    uidPrefix: 'p_',
    idFromName: (name) => slugify(name, 'painting'),
  },
  dialog: {
    list: 'dialogs',
    idField: 'dialogId',
    orderField: 'dialogOrder',
    excludedKey: 'excludedDialogIds',
    targets: ['nexo'],
    // All Nexo dialogs share the namespace `nexo`
    globalId: (_, dialog) => dialogKey(dialog.dialogId),
    uidPrefix: 'd_',
    idFromName: (name) => slugify(name, 'dialog'),
  },
};

/** The kinds whose entries start from an uploaded file (dialogs are written in their editor instead). */
export type UploadMediaKind = Exclude<MediaKind, 'dialog'>;

/** All kinds in the order they are shown and stored. */
export const MEDIA_KIND_LIST: MediaKind[] = ['glyph', 'sound', 'painting', 'dialog'];

/** Whether projects of `target` have entries of `kind` (dialogs are Nexo only). */
export function isMediaKindOffered(target: PackTargetId, kind: MediaKind): boolean {
  const targets = MEDIA_KINDS[kind].targets;
  return !targets || targets.includes(target);
}

/** The project list of `kind`. */
export function mediaList<K extends MediaKind>(project: MediaLists, kind: K): MediaEntryByKind[K][] {
  return project[MEDIA_KINDS[kind].list] as MediaEntryByKind[K][];
}

/** Replaces the project list of `kind` (mutates – for Immer drafts). */
export function setMediaList<K extends MediaKind>(project: MediaLists, kind: K, list: MediaEntryByKind[K][]): void {
  (project as Record<keyof MediaLists, unknown>)[MEDIA_KINDS[kind].list] = list;
}

/** Builds all lists, e.g. `mapMediaLists(() => [])`. */
export function mapMediaLists(build: <K extends MediaKind>(kind: K) => MediaEntryByKind[K][]): MediaLists {
  return { glyphs: build('glyph'), sounds: build('sound'), paintings: build('painting'), dialogs: build('dialog') };
}

/** The ID that must be unique across all exported projects (see `globalId`). */
export function mediaGlobalId<K extends MediaKind>(project: Pick<Project, 'namespace'>, kind: K, entry: MediaEntryByKind[K]): string {
  return (MEDIA_KINDS[kind].globalId as MediaKindInfo<K>['globalId'])(project, entry);
}

/** The user-facing ID of an entry (glyphId, soundId, paintingId, dialogId). */
export function mediaId<K extends MediaKind>(kind: K, entry: MediaEntryByKind[K]): string {
  return String(entry[MEDIA_KINDS[kind].idField]);
}
