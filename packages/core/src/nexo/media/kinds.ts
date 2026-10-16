/**
 * The project lists of glyphs, sounds and paintings. Everything that treats them alike (sync,
 * export selection, migration) iterates this registry instead of spelling out each kind.
 */
import type { Project } from '../../project/types';
import type { Glyph } from '../glyphs/model';
import type { Painting } from '../paintings/model';
import type { Sound } from '../sounds/model';
import { mediaKey } from './entry';

export interface MediaEntryByKind {
  glyph: Glyph;
  sound: Sound;
  painting: Painting;
}

export type MediaKind = keyof MediaEntryByKind;
export type MediaEntry = MediaEntryByKind[MediaKind];
export type MediaLists = Pick<Project, 'glyphs' | 'sounds' | 'paintings'>;

interface MediaKindInfo<K extends MediaKind> {
  /** Project field of the list; also the folder of the entries in a shared project */
  list: keyof MediaLists;
  /** Field with the user-facing ID */
  idField: keyof MediaEntryByKind[K] & string;
  /** Order field in project.json of a shared project */
  orderField: 'glyphOrder' | 'soundOrder' | 'paintingOrder';
  /** Key of the deselected IDs in an export selection */
  excludedKey: 'excludedGlyphIds' | 'excludedSoundIds' | 'excludedPaintingIds';
  /** ID that must be unique across all exported projects (glyph IDs have no namespace in Nexo) */
  globalId: (project: Pick<Project, 'namespace'>, entry: MediaEntryByKind[K]) => string;
}

export const MEDIA_KINDS: { [K in MediaKind]: MediaKindInfo<K> } = {
  glyph: {
    list: 'glyphs',
    idField: 'glyphId',
    orderField: 'glyphOrder',
    excludedKey: 'excludedGlyphIds',
    globalId: (_, glyph) => glyph.glyphId,
  },
  sound: {
    list: 'sounds',
    idField: 'soundId',
    orderField: 'soundOrder',
    excludedKey: 'excludedSoundIds',
    globalId: (project, sound) => mediaKey(project, sound.soundId),
  },
  painting: {
    list: 'paintings',
    idField: 'paintingId',
    orderField: 'paintingOrder',
    excludedKey: 'excludedPaintingIds',
    globalId: (project, painting) => mediaKey(project, painting.paintingId),
  },
};

/** All kinds in the order they are shown and stored. */
export const MEDIA_KIND_LIST: MediaKind[] = ['glyph', 'sound', 'painting'];

/** The project list of `kind`. */
export function mediaList<K extends MediaKind>(project: MediaLists, kind: K): MediaEntryByKind[K][] {
  return project[MEDIA_KINDS[kind].list] as MediaEntryByKind[K][];
}

/** Replaces the project list of `kind` (mutates – for Immer drafts). */
export function setMediaList<K extends MediaKind>(project: MediaLists, kind: K, list: MediaEntryByKind[K][]): void {
  (project as Record<keyof MediaLists, unknown>)[MEDIA_KINDS[kind].list] = list;
}

/** Builds all three lists, e.g. `mapMediaLists(() => [])`. */
export function mapMediaLists(build: <K extends MediaKind>(kind: K) => MediaEntryByKind[K][]): MediaLists {
  return { glyphs: build('glyph'), sounds: build('sound'), paintings: build('painting') };
}

/** The ID that must be unique across all exported projects (see `globalId`). */
export function mediaGlobalId<K extends MediaKind>(project: Pick<Project, 'namespace'>, kind: K, entry: MediaEntryByKind[K]): string {
  return (MEDIA_KINDS[kind].globalId as MediaKindInfo<K>['globalId'])(project, entry);
}

/** The user-facing ID of an entry (glyphId, soundId, paintingId). */
export function mediaId<K extends MediaKind>(kind: K, entry: MediaEntryByKind[K]): string {
  return String(entry[MEDIA_KINDS[kind].idField]);
}
