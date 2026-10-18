/** Export of sounds: the sounds.yml entry (OGG files: see soundFilePath). */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import type { Project } from '../../project/types';
import { soundEventKey, soundFilePath, type Sound } from '../../project/media/sound';

/**
 * Entry for sounds.yml: its files, or (`type: EVENT`) the one sound event it plays. A replacing sound overrides the
 * vanilla event of its name; without files it silences it. Nexo 1.30 reads `subtitle` and the EVENT type, which its
 * docs do not list yet.
 */
export function soundToYaml(project: Project, sound: Sound): Record<string, unknown> {
  const ns = project.namespace;
  const out: Record<string, unknown> = { id: soundEventKey(project, sound) };
  const reference = sound.reference.trim();
  if (reference) {
    out.type = 'EVENT';
    out.reference_id = reference;
  } else {
    const refs = sound.files.map((_, i) => formatResourceLocation(ns, soundFilePath(sound, i)));
    if (refs.length === 1) out.sound = refs[0];
    else out.sounds = refs;
  }
  if (sound.stream) out.stream = true;
  if (sound.preload) out.preload = true;
  if (sound.volume !== null) out.volume = sound.volume;
  if (sound.pitch !== null) out.pitch = sound.pitch;
  if (sound.weight !== null) out.weight = sound.weight;
  if (sound.distance !== null) out.attenuation_distance = sound.distance;
  if (sound.replace) out.replace = true;
  if (sound.subtitle.trim()) out.subtitle = sound.subtitle.trim();
  if (sound.jukebox) {
    const song: Record<string, unknown> = { duration: sound.jukebox.duration.trim() || '1s' };
    if (sound.jukebox.description.trim()) song.description = sound.jukebox.description.trim();
    if (sound.jukebox.comparatorOutput !== null) song.comparator_output = sound.jukebox.comparatorOutput;
    if (sound.jukebox.range !== null) song.range = sound.jukebox.range;
    out.jukebox_playable = song;
  }
  return out;
}
