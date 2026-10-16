import { fileStem } from '@resourcepackbuilder/ui';
import { notify } from '../../shell/notify';

/** A dropped or picked file read for a glyph, sound or painting. */
interface MediaFileEntry<T> {
  /** File name without extension, the base for the new ID. */
  name: string;
  file: T;
}

/**
 * A reader for dropped or picked media files: `read` turns a file into the stored form, or `null` when the
 * file is not supported; such files are reported with `rejectMessage(fileName)`.
 */
export function createMediaFileReader<T>(
  read: (file: File) => Promise<T | null>,
  rejectMessage: (fileName: string) => string,
): (files: File[]) => Promise<MediaFileEntry<T>[]> {
  return async (files) => {
    const entries: MediaFileEntry<T>[] = [];
    for (const file of files) {
      const result = await read(file);
      if (result === null) notify('error', rejectMessage(file.name));
      else entries.push({ name: fileStem(file.name), file: result });
    }
    return entries;
  };
}
