import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/binary/png';
import type { PaintingFile } from '@resourcepackbuilder/core/nexo/paintings/model';
import { readPngAsDataUrl } from '@resourcepackbuilder/ui';

export const PAINTING_ACCEPT = '.png,image/png';
export const PAINTING_FORMATS = ['.png'];

/** Reads a PNG as a painting texture; `null` when the file is no PNG. */
export async function readPaintingFile(file: File): Promise<PaintingFile | null> {
  const dataUrl = await readPngAsDataUrl(file);
  const info = readPngInfoFromDataUrl(dataUrl);
  return info ? { name: file.name, dataUrl, width: info.width, height: info.height } : null;
}
