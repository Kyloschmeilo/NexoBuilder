/** Glyphs, sounds and paintings, and the items that use sounds and paintings. */
import type { MediaFile } from '@resourcepackbuilder/core/nexo/media/entry';
import type { MediaItemInput } from '@resourcepackbuilder/core/nexo/media/items';
import type { MediaEntryByKind, MediaKind } from '@resourcepackbuilder/core/nexo/media/kinds';
import { addMediaEntry, deleteMediaEntry, findMediaEntry } from '@resourcepackbuilder/core/nexo/media/operations';
import { createGlyph, type GlyphKind } from '@resourcepackbuilder/core/nexo/glyphs/model';
import { createPainting } from '@resourcepackbuilder/core/nexo/paintings/model';
import { createSound, setSoundJukebox as setJukebox, type JukeboxSong, type SoundFile } from '@resourcepackbuilder/core/nexo/sounds/model';
import { firstRootFolder, insertNewItem } from '@resourcepackbuilder/core/project/operations';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { mutate } from '../store/project';
import { showItem } from './items';

/** Add, update and delete for one media list; the same for glyphs, sounds and paintings. */
function mediaCommands<K extends MediaKind>(kind: K) {
  type Entry = MediaEntryByKind[K];
  return {
    /** Adds an entry with a unique ID derived from `name`; `create` builds it. Returns its internal ID. */
    add(name: string, create: (id: string, mediaId: string) => Entry): string | null {
      const created: Entry[] = [];
      mutate((draft) => {
        created.push(addMediaEntry(draft, kind, name, create));
      });
      return created[0]?.id ?? null;
    },
    /** Changes an entry; equal `historyKey`s in quick succession form one undo step. */
    update(id: string, recipe: (entry: Entry) => void, historyKey?: string): void {
      mutate(
        (draft) => {
          const entry = findMediaEntry(draft, kind, id);
          if (entry) recipe(entry);
        },
        historyKey === undefined ? undefined : `${kind}:${id}:${historyKey}`,
      );
    },
    remove(id: string): void {
      mutate((draft) => deleteMediaEntry(draft, kind, id));
    },
  };
}

export const MEDIA_COMMANDS = {
  glyph: mediaCommands('glyph'),
  sound: mediaCommands('sound'),
  painting: mediaCommands('painting'),
};

/* ------------------------------------------------------------------ glyphs */

export function addGlyph(name: string, file: MediaFile | null, kind: GlyphKind): string | null {
  return MEDIA_COMMANDS.glyph.add(name, (id, glyphId) => createGlyph(id, glyphId, file, kind));
}

export const updateGlyph = MEDIA_COMMANDS.glyph.update;

/* ------------------------------------------------------------------ sounds */

export function addSound(name: string, files: SoundFile[]): string | null {
  return MEDIA_COMMANDS.sound.add(name, (id, soundId) => createSound(id, soundId, files));
}

export const updateSound = MEDIA_COMMANDS.sound.update;

/** Adds variants to a sound; one of its files is played at random. */
export function addSoundFiles(soundId: string, files: SoundFile[]): void {
  updateSound(soundId, (sound) => {
    sound.files.push(...files);
  });
}

export function removeSoundFile(soundId: string, index: number): void {
  updateSound(soundId, (sound) => {
    sound.files.splice(index, 1);
  });
}

/** Registers the sound as a jukebox song (music disc) or unregisters it. */
export function setSoundJukebox(soundId: string, enabled: boolean): void {
  updateSound(soundId, (sound) => setJukebox(sound, enabled));
}

/** Changes the jukebox song of a sound that is registered as one. */
export function updateJukeboxSong(soundId: string, recipe: (song: JukeboxSong) => void, historyKey?: string): void {
  updateSound(
    soundId,
    (sound) => {
      if (sound.jukebox) recipe(sound.jukebox);
    },
    historyKey,
  );
}

/* ------------------------------------------------------------------ paintings */

export function addPainting(name: string, file: MediaFile | null): string | null {
  return MEDIA_COMMANDS.painting.add(name, (id, paintingId) => createPainting(id, paintingId, file));
}

export const updatePainting = MEDIA_COMMANDS.painting.update;

/* ------------------------------------------------------------------ items for media */

/**
 * Creates an item for a painting or sound (see core nexo/media/items) in the first folder – or a new folder
 * named `folderName` – as one undo step, and selects it. Returns whether an item was created.
 */
export function addMediaItem({ configure, ...input }: MediaItemInput, folderName: string): boolean {
  const created: Item[] = [];
  mutate((draft) => {
    created.push(insertNewItem(draft, { ...input, folderId: firstRootFolder(draft, folderName), model: null }, configure));
  });
  const [item] = created;
  if (item) showItem(item.folderId, item.id);
  return Boolean(item);
}
