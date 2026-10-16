/** Which files glyphs, sounds and paintings take, and how a picked or dropped file is read for each. */
import { glyphFileFromDataUrl, type MediaFile, type MediaKind, pngMediaFile, type SoundFile } from '@resourcepackbuilder/core/project';
import { PNG_ACCEPT, readAsDataUrl, readPngAsDataUrl } from '@resourcepackbuilder/ui';

/** The stored form of an uploaded file, per kind. */
export interface MediaFileByKind {
  glyph: MediaFile;
  sound: SoundFile;
  painting: MediaFile;
}

interface MediaFileType<T> {
  /** For file pickers and drop zones */
  accept: string;
  /** Extensions shown in the drop zone */
  formats: string[];
  /** The stored form of the file, or `null` when it is not supported */
  read: (file: File) => Promise<T | null>;
}

/** Reads a PNG with its size; `null` when the file is no valid PNG. */
export async function readPngFile(file: File): Promise<MediaFile | null> {
  return pngMediaFile(file.name, await readPngAsDataUrl(file));
}

export const MEDIA_FILES: { [K in MediaKind]: MediaFileType<MediaFileByKind[K]> } = {
  glyph: {
    accept: '.png,.gif,image/png,image/gif',
    formats: ['.png', '.gif'],
    read: async (file) => {
      const isGif = file.name.toLowerCase().endsWith('.gif');
      return glyphFileFromDataUrl(file.name, await readAsDataUrl(file, isGif ? 'image/gif' : 'image/png'));
    },
  },
  sound: {
    accept: '.ogg,audio/ogg',
    formats: ['.ogg'],
    // OGG is the only format Minecraft plays
    read: async (file) =>
      file.name.toLowerCase().endsWith('.ogg')
        ? { name: file.name, dataUrl: await readAsDataUrl(file, 'audio/ogg'), size: file.size }
        : null,
  },
  painting: {
    accept: PNG_ACCEPT,
    formats: ['.png'],
    read: readPngFile,
  },
};
