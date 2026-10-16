/** Glyphs, sounds and paintings, and the items that use sounds and paintings. */
import { createFolder, insertFolder } from '@resourcepackbuilder/core/project/factory';
import { uid, uniqueId } from '@resourcepackbuilder/core/id';
import type { Item, Project } from '@resourcepackbuilder/core/project/types';
import { slugify, toIdentifier } from '@resourcepackbuilder/core/text';
import { ID_CHARS, SOUND_ID_CHARS } from '@resourcepackbuilder/core/minecraft/resourceLocation';
import { DEFAULT_MATERIAL } from '@resourcepackbuilder/core/nexo/material';
import { createGlyph, type Glyph, type GlyphKind } from '@resourcepackbuilder/core/nexo/glyphs/model';
import type { MediaFile } from '@resourcepackbuilder/core/nexo/media/entry';
import { createPainting, type Painting } from '@resourcepackbuilder/core/nexo/paintings/model';
import { createSound, type JukeboxSong, type Sound, type SoundFile } from '@resourcepackbuilder/core/nexo/sounds/model';
import { mutate } from '../store/project';
import { insertNewItem, showItem } from './items';

/* ------------------------------------------------------------------ glyphs */

export function addGlyph(name: string, file: MediaFile | null, kind: GlyphKind): string {
  const id = uid('g_');
  mutate((draft) => {
    const glyphId = uniqueId(slugify(name, 'glyph'), new Set(draft.glyphs.map((g) => g.glyphId)));
    draft.glyphs.push(createGlyph(id, glyphId, file, kind));
  });
  return id;
}

export function updateGlyph(glyphId: string, recipe: (glyph: Glyph) => void, historyKey?: string): void {
  mutate(
    (draft) => {
      const glyph = draft.glyphs.find((g) => g.id === glyphId);
      if (glyph) recipe(glyph);
    },
    historyKey === undefined ? undefined : `glyph:${glyphId}:${historyKey}`,
  );
}

export function deleteGlyph(glyphId: string): void {
  mutate((draft) => {
    draft.glyphs = draft.glyphs.filter((g) => g.id !== glyphId);
  });
}

/* ------------------------------------------------------------------ sounds */

export function addSound(name: string, files: SoundFile[]): string {
  const id = uid('s_');
  mutate((draft) => {
    const soundId = uniqueId(toIdentifier(name, SOUND_ID_CHARS, 'sound'), new Set(draft.sounds.map((s) => s.soundId)));
    draft.sounds.push(createSound(id, soundId, files));
  });
  return id;
}

export function updateSound(soundId: string, recipe: (sound: Sound) => void, historyKey?: string): void {
  mutate(
    (draft) => {
      const sound = draft.sounds.find((s) => s.id === soundId);
      if (sound) recipe(sound);
    },
    historyKey === undefined ? undefined : `sound:${soundId}:${historyKey}`,
  );
}

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

/** Registers the sound as a jukebox song (music disc), streamed because music is long – or unregisters it. */
export function setSoundJukebox(soundId: string, enabled: boolean): void {
  updateSound(soundId, (sound) => {
    sound.jukebox = enabled ? { duration: '', description: '', comparatorOutput: null, range: null } : null;
    if (enabled) sound.stream = true;
  });
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

export function deleteSound(soundId: string): void {
  mutate((draft) => {
    draft.sounds = draft.sounds.filter((s) => s.id !== soundId);
  });
}

/* ------------------------------------------------------------------ paintings */

export function addPainting(name: string, file: MediaFile | null): string {
  const id = uid('p_');
  mutate((draft) => {
    const paintingId = uniqueId(slugify(name, 'painting'), new Set(draft.paintings.map((p) => p.paintingId)));
    draft.paintings.push(createPainting(id, paintingId, file));
  });
  return id;
}

export function updatePainting(paintingId: string, recipe: (painting: Painting) => void, historyKey?: string): void {
  mutate(
    (draft) => {
      const painting = draft.paintings.find((p) => p.id === paintingId);
      if (painting) recipe(painting);
    },
    historyKey === undefined ? undefined : `painting:${paintingId}:${historyKey}`,
  );
}

export function deletePainting(paintingId: string): void {
  mutate((draft) => {
    draft.paintings = draft.paintings.filter((p) => p.id !== paintingId);
  });
}

/* ------------------------------------------------------------------ items for media */

/** The first top-level folder, created with `name` when the project has none. */
function firstFolder(draft: Project, name: string): string {
  const existing = draft.rootFolderIds.find((id) => draft.folders[id]);
  if (existing) return existing;
  const folder = createFolder(name, null);
  insertFolder(draft, folder);
  return folder.id;
}

/** Creates an item in the first folder (or a new folder named `folderName`) – one undo step – and selects it. */
function addMediaItem(
  folderName: string,
  input: { displayName: string; nexoId: string; material: string },
  configure: (item: Item) => void,
): void {
  const created: Item[] = [];
  mutate((draft) => {
    created.push(insertNewItem(draft, { ...input, folderId: firstFolder(draft, folderName), model: null }, configure));
  });
  const [item] = created;
  if (item) showItem(item.folderId, item.id);
}

/** Creates an item that hangs this painting (material PAINTING + painting_variant). */
export function addPaintingItem(painting: Painting, namespace: string, folderName: string): void {
  addMediaItem(
    folderName,
    { displayName: painting.title || painting.paintingId, nexoId: painting.paintingId, material: 'PAINTING' },
    (item) => {
      item.config.Components = { painting_variant: `${namespace}:${painting.paintingId}` };
    },
  );
}

/** Creates an item that plays this sound as a music disc in the jukebox. */
export function addMusicDiscItem(sound: Sound, namespace: string, folderName: string): void {
  const nexoId = `${toIdentifier(sound.soundId, ID_CHARS, 'sound')}_disc`;
  addMediaItem(folderName, { displayName: sound.jukebox?.description || sound.soundId, nexoId, material: DEFAULT_MATERIAL }, (item) => {
    item.config.Components = { max_stack_size: 1, jukebox_playable: { song_key: `${namespace}:${sound.soundId}` } };
  });
}
