/**
 * Glyphs, sounds and paintings as CraftEngine config sections (the pack files are the same as Nexo's, see export/media):
 *   images: a glyph's PNG as a bitmap font character, emoji: the chat shortcuts of a glyph,
 *   sounds: the sound events, jukebox_songs: the sounds that are music discs, paintings: the painting variants.
 */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import type { Project } from '../project/types';
import { mediaKey } from '../project/media/entry';
import { EMOJI_CONTEXTS, type Glyph, isMultiBitmap } from '../project/media/glyph';
import type { Painting } from '../project/media/painting';
import { durationSeconds, soundEventKey, soundFilePath, type Sound } from '../project/media/sound';

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
  else if (glyph.char) out.char = glyph.char;
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

/**
 * The emoji that replaces the glyph's chat shortcuts with `image`, or with its own content (also per text context);
 * CraftEngine suggests them unless turned off.
 */
function emoji(glyph: Glyph, image: string, keywords: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { image, keywords };
  if (glyph.emojiContent.trim()) out.content = glyph.emojiContent.trim();
  const overrides = Object.fromEntries(
    EMOJI_CONTEXTS.flatMap((context) => {
      const content = glyph.emojiOverrides[context]?.trim();
      return content ? [[context, content]] : [];
    }),
  );
  if (Object.keys(overrides).length > 0) out.content_overrides = overrides;
  if (glyph.permission.trim()) out.permission = glyph.permission.trim();
  if (!glyph.tabcomplete) out.chat_completion = false;
  return out;
}

/**
 * The sound event: one OGG as a plain path, with volume, pitch, weight, stream, range or preload as a sound object,
 * and the sound event it plays as an entry of `type: event`. A replacing sound overrides the vanilla event.
 */
export function craftEngineSound(project: Project, sound: Sound): Record<string, unknown> {
  const entry = (name: string, type?: 'event'): Record<string, unknown> | string => {
    const out: Record<string, unknown> = { name, ...(type && { type }) };
    if (sound.volume !== null) out.volume = sound.volume;
    if (sound.pitch !== null) out.pitch = sound.pitch;
    if (sound.weight !== null) out.weight = sound.weight;
    if (sound.stream) out.stream = true;
    if (sound.distance !== null) out.attenuation_distance = sound.distance;
    if (sound.preload) out.preload = true;
    return Object.keys(out).length > 1 ? out : name;
  };
  const entries = sound.files.map((_, i) => entry(formatResourceLocation(project.namespace, soundFilePath(sound, i))));
  const reference = sound.reference.trim();
  if (reference) entries.push(entry(reference, 'event'));
  const out: Record<string, unknown> = {};
  if (sound.replace) out.replace = true;
  if (sound.subtitle.trim()) out.subtitle = sound.subtitle.trim();
  out.sounds = entries;
  return out;
}

/** The jukebox song of a music disc; null for other sounds. */
export function craftEngineJukeboxSong(project: Project, sound: Sound): Record<string, unknown> | null {
  if (!sound.jukebox) return null;
  const out: Record<string, unknown> = {
    sound: soundEventKey(project, sound),
    length: durationSeconds(sound.jukebox.duration) ?? 1,
  };
  if (sound.jukebox.description.trim()) out.description = sound.jukebox.description.trim();
  if (sound.jukebox.comparatorOutput !== null) out.comparator_output = sound.jukebox.comparatorOutput;
  if (sound.jukebox.range !== null) out.range = sound.jukebox.range;
  return out;
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
