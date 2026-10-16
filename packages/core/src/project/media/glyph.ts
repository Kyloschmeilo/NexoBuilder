/**
 * Glyphs (Nexo: configuration/glyphs) – textured Unicode characters for chat, lore, titles and GUIs.
 * Export: plugins/Nexo/glyphs/<project>.yml + textures in the external pack
 * (assets/<ns>/textures/glyphs/<id>.png or .gif).
 */
import { readGifInfoFromDataUrl, readPngInfoFromDataUrl } from '@resourcepackbuilder/minecraft';
import type { MediaFile } from './entry';

export type GlyphKind = 'image' | 'gif' | 'reference';

export interface Glyph {
  id: string;
  /** Key in the YAML, used as <glyph:id> */
  glyphId: string;
  kind: GlyphKind;
  file: MediaFile | null;
  ascent: number;
  height: number;
  font: string;
  permission: string;
  placeholders: string[];
  isEmoji: boolean;
  tabcomplete: boolean;
  rows: number;
  columns: number;
  /** GIF only */
  frameCount: number | null;
  offset: number | null;
  /** reference glyphs only */
  reference: string;
  index: number;
}

/** Height of chat text in Minecraft pixels; the height of small glyphs (emojis). */
export const CHAT_TEXT_HEIGHT = 8;
/** Ascent of Minecraft's default font; a glyph with another ascent sits higher or lower than the text. */
export const DEFAULT_FONT_ASCENT = 7;

/** Maximum size of a single glyph cell (otherwise use multi-bitmap). */
export const MAX_GLYPH_CELL = 256;

export function createGlyph(id: string, glyphId: string, file: MediaFile | null, kind: GlyphKind = 'image'): Glyph {
  // Small images are usually emojis (as high as chat text), large images GUI backgrounds
  const small = !file || (file.width <= 32 && file.height <= 32);
  const height = file && !small ? Math.min(file.height, MAX_GLYPH_CELL) : CHAT_TEXT_HEIGHT;
  return {
    id,
    glyphId,
    kind,
    file,
    ascent: small ? DEFAULT_FONT_ASCENT : Math.min(height, 13),
    height,
    font: '',
    permission: '',
    placeholders: [],
    isEmoji: small && kind !== 'reference',
    tabcomplete: false,
    rows: 1,
    columns: 1,
    frameCount: null,
    offset: null,
    reference: '',
    index: 1,
  };
}

/** The glyph kind an uploaded image becomes: animated for GIFs. */
export function glyphKindOf(file: MediaFile): 'image' | 'gif' {
  return file.dataUrl.startsWith('data:image/gif') ? 'gif' : 'image';
}

/** An image glyph split into several cells, addressed by reference glyphs. */
export function isMultiBitmap(glyph: Glyph): boolean {
  return glyph.kind === 'image' && glyph.rows * glyph.columns > 1;
}

/** The tag that shows the glyph in chat, lore etc.; for a multi-bitmap its first cell. */
export function glyphTag(glyph: Glyph): string {
  return isMultiBitmap(glyph) ? `<glyph:${glyph.glyphId}:1>` : `<glyph:${glyph.glyphId}>`;
}

/** Reads a dropped PNG/GIF file as a glyph file. */
export function glyphFileFromDataUrl(name: string, dataUrl: string): MediaFile | null {
  const png = readPngInfoFromDataUrl(dataUrl);
  if (png) return { name, dataUrl, ...png };
  const gif = readGifInfoFromDataUrl(dataUrl);
  if (gif) return { name, dataUrl, ...gif };
  return null;
}
