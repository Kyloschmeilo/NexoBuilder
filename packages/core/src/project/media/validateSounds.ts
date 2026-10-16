import { isOggDataUrl, NAMESPACE_PATTERN } from '@resourcepackbuilder/minecraft';
import type { Issue } from '@resourcepackbuilder/utils';
import type { Project } from '../types';
import { validateEntries } from './entry';

const DURATION_PATTERN = /^\s*\d+(\.\d+)?\s*[tsmhd]?(\s+\d+(\.\d+)?\s*[tsmhd])*\s*$/;

/** Checks all sounds of the project; each issue targets its sound and carries a `context.sound` frame. */
export function validateSounds(project: Project): Issue[] {
  return validateEntries(project.sounds ?? [], { kind: 'sound', idOf: (s) => s.soundId, pattern: NAMESPACE_PATTERN }, (sound, add) => {
    if (sound.files.length === 0) add('error', 'sound.fileMissing');
    for (const file of sound.files) {
      if (!isOggDataUrl(file.dataUrl)) add('error', 'sound.notOgg', { file: file.name });
    }
    if (sound.volume !== null && (sound.volume <= 0 || sound.volume > 10)) add('warning', 'sound.volumeRange');
    if (sound.jukebox) {
      if (!DURATION_PATTERN.test(sound.jukebox.duration)) add('error', 'sound.jukeboxDurationMissing');
      const output = sound.jukebox.comparatorOutput;
      if (output !== null && (output < 0 || output > 15 || !Number.isInteger(output))) add('error', 'sound.comparatorRange');
      if (!sound.stream && sound.files.some((f) => f.size > 1_000_000)) add('info', 'sound.streamLongSongs');
    }
  });
}
