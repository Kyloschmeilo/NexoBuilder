/** The files models are imported from: picker filter, formats shown on drop zones, and reading them for the drafts. */
import type { ImportFile } from '@resourcepackbuilder/minecraft';
import { readAsText, readPngAsDataUrl } from '@resourcepackbuilder/ui';

export const MODEL_ACCEPT = '.bbmodel,.json,.png,.mcmeta';
export const MODEL_FORMATS = ['.bbmodel', '.json + .png', '.png', '.png.mcmeta'];

const TEXT_EXTENSIONS = /\.(json|bbmodel|mcmeta|ya?ml|txt)$/i;

/** Reads dropped or picked files: PNGs as data URL, models/metadata/YAML as text, others by name only. */
export async function readImportFiles(files: File[]): Promise<ImportFile[]> {
  return Promise.all(
    files.map(async (file): Promise<ImportFile> => {
      if (/\.png$/i.test(file.name) || file.type === 'image/png') return { name: file.name, dataUrl: await readPngAsDataUrl(file) };
      if (TEXT_EXTENSIONS.test(file.name)) return { name: file.name, text: await readAsText(file) };
      return { name: file.name };
    }),
  );
}
