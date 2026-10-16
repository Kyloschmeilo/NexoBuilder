/** Readers for picked or dropped files that report unsupported files with a toast. */
import { useTranslations } from 'next-intl';
import type { MediaFile, MediaKind } from '@resourcepackbuilder/core/project';
import { fileStem, pickFiles, PNG_ACCEPT } from '@resourcepackbuilder/ui';
import { MEDIA_FILES, readPngFile, type MediaFileByKind } from '../lib/mediaFiles';
import { notify } from '../shell/notify';

/** A file read for a glyph, sound or painting. */
export interface ReadMediaFile<T> {
  /** File name without extension, the base for the new ID. */
  name: string;
  file: T;
}

/** Reads every file with `read`; files it rejects (`null`) are reported with `rejectMessage(fileName)`. */
function createFileReader<T>(
  read: (file: File) => Promise<T | null>,
  rejectMessage: (fileName: string) => string,
): (files: File[]) => Promise<ReadMediaFile<T>[]> {
  return async (files) => {
    const entries: ReadMediaFile<T>[] = [];
    for (const file of files) {
      const result = await read(file);
      if (result === null) notify('error', rejectMessage(file.name));
      else entries.push({ name: fileStem(file.name), file: result });
    }
    return entries;
  };
}

const REJECT_KEYS = {
  glyph: 'glyphs.notImage',
  sound: 'sounds.notOgg',
  painting: 'paintings.notPng',
} as const satisfies Record<MediaKind, string>;

/** Reads dropped or picked files for a glyph, sound or painting (see MEDIA_FILES); other files are reported. */
export function useMediaFileReader<K extends MediaKind>(kind: K): (files: File[]) => Promise<ReadMediaFile<MediaFileByKind[K]>[]> {
  const t = useTranslations('media');
  const rejectKey: (typeof REJECT_KEYS)[MediaKind] = REJECT_KEYS[kind];
  return createFileReader(MEDIA_FILES[kind].read as (file: File) => Promise<MediaFileByKind[K] | null>, (name) => t(rejectKey, { name }));
}

/** Reads a PNG with its size; files that are no valid PNG are reported and give `null`. */
export function usePngReader(): (file: File) => Promise<MediaFile | null> {
  const t = useTranslations('item');
  const read = createFileReader(readPngFile, () => t('editor.invalidPng'));
  return async (file) => (await read([file]))[0]?.file ?? null;
}

/** Lets the user pick one PNG and reads it (see usePngReader); `null` when cancelled or invalid. */
export function usePngPicker(): () => Promise<MediaFile | null> {
  const readPng = usePngReader();
  return async () => {
    const [file] = await pickFiles(PNG_ACCEPT, false);
    return file ? readPng(file) : null;
  };
}
