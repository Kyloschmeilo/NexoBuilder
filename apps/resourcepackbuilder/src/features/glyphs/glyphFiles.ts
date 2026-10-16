import { glyphFileFromDataUrl } from '@resourcepackbuilder/core/nexo/glyphs/model';
import type { MediaFile } from '@resourcepackbuilder/core/nexo/media/entry';
import { readAsDataUrl } from '@resourcepackbuilder/ui';

export const GLYPH_ACCEPT = '.png,.gif,image/png,image/gif';
export const GLYPH_FORMATS = ['.png', '.gif'];

/** Reads a PNG or GIF as a glyph image; `null` when it is neither. */
export async function readGlyphFile(file: File): Promise<MediaFile | null> {
  const isGif = file.name.toLowerCase().endsWith('.gif');
  return glyphFileFromDataUrl(file.name, await readAsDataUrl(file, isGif ? 'image/gif' : 'image/png'));
}

/** The glyph kind an image becomes: animated for GIFs. */
export function glyphKindOf(file: MediaFile): 'image' | 'gif' {
  return file.dataUrl.startsWith('data:image/gif') ? 'gif' : 'image';
}
