/**
 * Glyphs (Nexo: configuration/glyphs) – textured Unicode characters for chat, lore, titles and GUIs.
 * Export: plugins/Nexo/glyphs/<project>.yml + textures in the external pack
 * (assets/<ns>/textures/glyphs/<id>.png or .gif).
 */
import { readGifInfoFromDataUrl, readPngInfoFromDataUrl } from '@resourcepackbuilder/minecraft';
import type { MediaFile } from './entry';

export type GlyphKind = 'image' | 'gif' | 'reference';

/** How Nexo animates a GIF glyph: a core shader or a sprite sheet (Nexo's `Glyphs.default_gif_type` when empty). */
export type GlyphGifType = '' | 'SHADER' | 'SPRITE';
export const GLYPH_GIF_TYPES: GlyphGifType[] = ['', 'SHADER', 'SPRITE'];

/** The text contexts in which CraftEngine replaces an emoji's keywords and that can have content of their own. */
export const EMOJI_CONTEXTS = ['chat', 'book', 'anvil', 'sign'] as const;
export type EmojiContext = (typeof EMOJI_CONTEXTS)[number];

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
  /** Explicit character of a single-cell glyph (Nexo and CraftEngine `char`); empty = assigned automatically */
  char: string;
  /** Nexo: text shadow color (`default_shadow`, #AARRGGBB); empty = `Glyphs.default_shadow` */
  shadow: string;
  /** Nexo GIF glyphs: animation type (`type`) */
  gifType: GlyphGifType;
  /** Nexo sprite-animated GIF glyphs: blend between frames (`interpolate`) */
  interpolate: boolean;
  /** Nexo: glyph whose settings this glyph inherits (`template`) */
  template: string;
  /** CraftEngine emoji: MiniMessage that replaces a keyword (`content`); empty = CraftEngine's default */
  emojiContent: string;
  /** CraftEngine emoji: content per text context (`content_overrides`) */
  emojiOverrides: Partial<Record<EmojiContext, string>>;
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
    char: '',
    shadow: '',
    gifType: '',
    interpolate: false,
    template: '',
    emojiContent: '',
    emojiOverrides: {},
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

/** Whether `text` is exactly one character (one Unicode code point), as an explicit glyph `char` must be. */
export function isSingleCharacter(text: string): boolean {
  return [...text].length === 1;
}

/** A shadow color as Nexo reads it: `#RRGGBB` or `#AARRGGBB` (also with `0x`). */
export const GLYPH_SHADOW_PATTERN = /^(#|0x)([0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Reads a dropped PNG/GIF file as a glyph file. */
export function glyphFileFromDataUrl(name: string, dataUrl: string): MediaFile | null {
  const png = readPngInfoFromDataUrl(dataUrl);
  if (png) return { name, dataUrl, ...png };
  const gif = readGifInfoFromDataUrl(dataUrl);
  if (gif) return { name, dataUrl, ...gif };
  return null;
}
