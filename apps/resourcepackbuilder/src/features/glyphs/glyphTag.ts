import type { Glyph } from '@resourcepackbuilder/core/nexo/glyphs/model';

/** An image glyph split into several cells, addressed by reference glyphs. */
export function isMultiBitmap(glyph: Glyph): boolean {
  return glyph.kind === 'image' && glyph.rows * glyph.columns > 1;
}

/** The tag that shows the glyph in chat, lore etc.; for a multi-bitmap its first cell. */
export function glyphTag(glyph: Glyph): string {
  return isMultiBitmap(glyph) ? `<glyph:${glyph.glyphId}:1>` : `<glyph:${glyph.glyphId}>`;
}
