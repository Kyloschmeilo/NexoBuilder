/** Export of sounds: OGG file paths and the sounds.yml entry. */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import type { Project } from '../../project/types';
import { mediaKey } from '../../project/media/entry';
import type { Sound } from '../../project/media/sound';

/** Path of the OGG file relative to assets/<ns>/sounds (without extension) */
export function soundFilePath(sound: Sound, index: number): string {
  const base = sound.soundId.split('.').filter(Boolean).join('/') || 'sound';
  return sound.files.length > 1 ? `${base}_${index + 1}` : base;
}

/** Entry for sounds.yml */
export function soundToYaml(project: Project, sound: Sound): Record<string, unknown> {
  const ns = project.namespace;
  const refs = sound.files.map((_, i) => formatResourceLocation(ns, soundFilePath(sound, i)));
  const out: Record<string, unknown> = { id: mediaKey(project, sound.soundId) };
  if (refs.length === 1) out.sound = refs[0];
  else out.sounds = refs;
  if (sound.stream) out.stream = true;
  if (sound.volume !== null) out.volume = sound.volume;
  if (sound.pitch !== null) out.pitch = sound.pitch;
  if (sound.distance !== null) out.attenuation_distance = sound.distance;
  if (sound.jukebox) {
    const song: Record<string, unknown> = { duration: sound.jukebox.duration.trim() || '1s' };
    if (sound.jukebox.description.trim()) song.description = sound.jukebox.description.trim();
    if (sound.jukebox.comparatorOutput !== null) song.comparator_output = sound.jukebox.comparatorOutput;
    if (sound.jukebox.range !== null) song.range = sound.jukebox.range;
    out.jukebox_playable = song;
  }
  return out;
}
