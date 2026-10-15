import type { SoundFile } from '@resourcepackbuilder/core/nexo/sounds/model';
import { readAsDataUrl } from '@resourcepackbuilder/ui';

export const SOUND_ACCEPT = '.ogg,audio/ogg';
export const SOUND_FORMATS = ['.ogg'];

/** Reads an OGG file (the only format Minecraft plays); `null` for other files. */
export async function readSoundFile(file: File): Promise<SoundFile | null> {
  if (!file.name.toLowerCase().endsWith('.ogg')) return null;
  return { name: file.name, dataUrl: await readAsDataUrl(file, 'audio/ogg'), size: file.size };
}
