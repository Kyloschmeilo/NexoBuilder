import { isOggDataUrl } from '../../binary/ogg';
import type { Issue } from '../../issues';
import { NAMESPACE_PATTERN } from '../../minecraft/resourceLocation';
import type { Project } from '../../project/types';
import { issueReporter } from '../issueReporter';

const DURATION_PATTERN = /^\s*\d+(\.\d+)?\s*[tsmhd]?(\s+\d+(\.\d+)?\s*[tsmhd])*\s*$/;

/** Checks all sounds of the project; each issue targets its sound and carries a `context.sound` frame. */
export function validateSounds(project: Project): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const sound of project.sounds ?? []) {
    const add = issueReporter(issues, {
      target: { kind: 'sound', id: sound.id },
      context: [{ code: 'context.sound', args: { sound: sound.soundId || '?' } }],
    });
    if (!NAMESPACE_PATTERN.test(sound.soundId)) add('error', 'sound.idInvalid');
    if (seen.has(sound.soundId)) add('error', 'sound.idDuplicate');
    seen.add(sound.soundId);
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
  }
  return issues;
}
