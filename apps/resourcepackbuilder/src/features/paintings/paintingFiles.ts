import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/binary/png';
import type { MediaFile } from '@resourcepackbuilder/core/nexo/media/entry';
import { readPngAsDataUrl } from '@resourcepackbuilder/ui';

export const PAINTING_ACCEPT = '.png,image/png';
export const PAINTING_FORMATS = ['.png'];

/** Reads a PNG as a painting texture; `null` when the file is no PNG. */
export async function readPaintingFile(file: File): Promise<MediaFile | null> {
  const dataUrl = await readPngAsDataUrl(file);
  const info = readPngInfoFromDataUrl(dataUrl);
  return info ? { name: file.name, dataUrl, width: info.width, height: info.height } : null;
}
