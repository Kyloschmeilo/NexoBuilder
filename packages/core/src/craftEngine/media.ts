/**
 * Glyphs, sounds and paintings as CraftEngine config sections (the pack files are the same as Nexo's, see export/media):
 *   images: a glyph's PNG as a bitmap font character, emoji: the chat shortcuts of a glyph,
 *   sounds: the sound events, jukebox_songs: the sounds that are music discs, paintings: the painting variants.
 */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import type { Project } from '../project/types';
import { mediaKey } from '../project/media/entry';
import { type Glyph, isMultiBitmap } from '../project/media/glyph';
import type { Painting } from '../project/media/painting';
import { soundFilePath, type Sound } from '../project/media/sound';

type Entries = Record<string, Record<string, unknown>>;

/** The image and emoji sections of the project's glyphs and the glyphs CraftEngine cannot show. */
export interface CraftEngineGlyphs {
  images: Entries;
  emoji: Entries;
  /** Animated glyphs: CraftEngine images are PNGs only */
  gifs: Glyph[];
  /** Reference glyphs whose multi-bitmap glyph is not in the project (the cell cannot be located) */
  unknownReferences: Glyph[];
  /** Glyphs with a permission but no chat shortcuts: CraftEngine checks permissions on emoji only, so it is dropped */
  unusedPermissions: Glyph[];
}

export function craftEngineGlyphs(project: Project): CraftEngineGlyphs {
  const out: CraftEngineGlyphs = { images: {}, emoji: {}, gifs: [], unknownReferences: [], unusedPermissions: [] };
  for (const glyph of project.glyphs) {
    if (glyph.kind === 'gif') {
      out.gifs.push(glyph);
      continue;
    }
    const image = glyph.kind === 'reference' ? referenceImage(project, glyph) : bitmapImage(project, glyph);
    if (!image) {
      out.unknownReferences.push(glyph);
      continue;
    }
    const key = mediaKey(project, glyph.glyphId);
    out.images[key] = image;
    const keywords = glyph.placeholders.map((p) => p.trim()).filter(Boolean);
    if (keywords.length > 0) out.emoji[key] = emoji(glyph, isMultiBitmap(glyph) ? `${key}:0:0` : key, keywords);
    else if (glyph.permission.trim()) out.unusedPermissions.push(glyph);
  }
  return out;
}

/** The tag that shows the glyph in text; for a multi-bitmap its first cell. */
export function craftEngineImageTag(project: Pick<Project, 'namespace'>, glyph: Glyph): string {
  const key = mediaKey(project, glyph.glyphId);
  return isMultiBitmap(glyph) ? `<image:${key}:0:0>` : `<image:${key}>`;
}

/** An image from the glyph's PNG (assets/<ns>/textures/glyphs/<id>.png); a multi-bitmap as a grid of characters. */
function bitmapImage(project: Project, glyph: Glyph): Record<string, unknown> {
  const out: Record<string, unknown> = {
    file: formatResourceLocation(project.namespace, `glyphs/${glyph.glyphId}.png`),
    height: glyph.height,
    ascent: glyph.ascent,
  };
  if (glyph.font.trim()) out.font = glyph.font.trim();
  if (isMultiBitmap(glyph)) out.grid_size = `${Math.max(1, glyph.rows)},${Math.max(1, glyph.columns)}`;
  return out;
}

/** A cell of a multi-bitmap glyph of the project: `ref: <ns>:<id>:<row>:<column>` (0-based, Nexo's index is 1-based). */
function referenceImage(project: Project, glyph: Glyph): Record<string, unknown> | null {
  const target = project.glyphs.find((g) => g.glyphId === glyph.reference && g.kind === 'image');
  if (!target) return null;
  const columns = Math.max(1, target.columns);
  const cell = Math.max(0, glyph.index - 1);
  return { ref: `${mediaKey(project, target.glyphId)}:${Math.floor(cell / columns)}:${cell % columns}` };
}

/** The emoji that replaces the glyph's chat shortcuts with `image`; CraftEngine suggests them unless turned off. */
function emoji(glyph: Glyph, image: string, keywords: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { image, keywords };
  if (glyph.permission.trim()) out.permission = glyph.permission.trim();
  if (!glyph.tabcomplete) out.chat_completion = false;
  return out;
}

/** The sound event: one OGG as a plain path, with volume, pitch, stream or range as a sound object. */
export function craftEngineSound(project: Project, sound: Sound): Record<string, unknown> {
  const files = sound.files.map((_, i) => {
    const name = formatResourceLocation(project.namespace, soundFilePath(sound, i));
    const file: Record<string, unknown> = { name };
    if (sound.volume !== null) file.volume = sound.volume;
    if (sound.pitch !== null) file.pitch = sound.pitch;
    if (sound.stream) file.stream = true;
    if (sound.distance !== null) file.attenuation_distance = sound.distance;
    return Object.keys(file).length > 1 ? file : name;
  });
  return { sounds: files };
}

/** The jukebox song of a music disc; null for other sounds. */
export function craftEngineJukeboxSong(project: Project, sound: Sound): Record<string, unknown> | null {
  if (!sound.jukebox) return null;
  const out: Record<string, unknown> = {
    sound: mediaKey(project, sound.soundId),
    length: durationSeconds(sound.jukebox.duration) ?? 1,
  };
  if (sound.jukebox.description.trim()) out.description = sound.jukebox.description.trim();
  if (sound.jukebox.comparatorOutput !== null) out.comparator_output = sound.jukebox.comparatorOutput;
  if (sound.jukebox.range !== null) out.range = sound.jukebox.range;
  return out;
}

const DURATION_UNITS: Record<string, number> = { t: 0.05, s: 1, m: 60, h: 3600, d: 86400 };
/** Longer texts are no song length anyone types */
const MAX_DURATION_LENGTH = 64;

/** Seconds of a duration like "2m 30s", "150s", "150" (seconds) or "3000t"; null when it cannot be read. */
export function durationSeconds(text: string): number | null {
  const input = text.trim();
  if (!input || input.length > MAX_DURATION_LENGTH) return null;
  // One part per step (sticky, so every step must start where the last ended): linear, no backtracking
  const part = /(\d+(?:\.\d+)?)\s*([tsmhd]?)\s*/y;
  let seconds = 0;
  while (part.lastIndex < input.length) {
    const match = part.exec(input);
    if (!match) return null;
    seconds += Number(match[1]) * DURATION_UNITS[match[2] || 's'];
  }
  return Math.round(seconds * 1000) / 1000;
}

/**
 * The painting variant; its texture is assets/<ns>/textures/painting/<id>.png, CraftEngine's default asset_id. A
 * painting in the op tab is never placed at random, so `show_in_op_tab` is the opposite of `randomPlace`.
 */
export function craftEnginePainting(painting: Painting): Record<string, unknown> {
  const out: Record<string, unknown> = { width: painting.width, height: painting.height };
  if (painting.title.trim()) out.title = painting.title.trim();
  if (painting.author.trim()) out.author = painting.author.trim();
  if (!painting.randomPlace) out.show_in_op_tab = true;
  return out;
}
