import { isOggDataUrl, NAMESPACE_PATTERN, RESOURCE_LOCATION_PATTERN } from '@resourcepackbuilder/minecraft';
import type { Issue } from '@resourcepackbuilder/utils';
import type { Project } from '../types';
import { validateEntries } from './entry';
import { durationSeconds } from './sound';

/**
 * Checks all sounds of the project; each issue targets its sound and carries a `context.sound` frame. A sound needs a
 * file unless it plays another sound event or replaces a vanilla one (no files then silence it).
 */
export function validateSounds(project: Project): Issue[] {
  return validateEntries(project.sounds ?? [], { kind: 'sound', idOf: (s) => s.soundId, pattern: NAMESPACE_PATTERN }, (sound, add) => {
    const reference = sound.reference.trim();
    if (sound.files.length === 0 && !reference && !sound.replace) add('error', 'sound.fileMissing');
    if (reference && !RESOURCE_LOCATION_PATTERN.test(reference)) add('error', 'sound.referenceInvalid');
    // Nexo's sound entry is either files or one event reference
    if (reference && sound.files.length > 0 && project.target === 'nexo') add('warning', 'sound.referenceIgnoresFiles');
    if (sound.weight !== null && (sound.weight < 1 || !Number.isInteger(sound.weight))) add('error', 'sound.weightInvalid');
    for (const file of sound.files) {
      if (!isOggDataUrl(file.dataUrl)) add('error', 'sound.notOgg', { file: file.name });
    }
    if (sound.volume !== null && (sound.volume <= 0 || sound.volume > 10)) add('warning', 'sound.volumeRange');
    if (sound.jukebox) {
      if (durationSeconds(sound.jukebox.duration) === null) add('error', 'sound.jukeboxDurationMissing');
      const output = sound.jukebox.comparatorOutput;
      if (output !== null && (output < 0 || output > 15 || !Number.isInteger(output))) add('error', 'sound.comparatorRange');
      if (!sound.stream && sound.files.some((f) => f.size > 1_000_000)) add('info', 'sound.streamLongSongs');
    }
  });
}
