/**
 * Custom sounds (Nexo: configuration/sounds) – OGG files in the resource pack plus an entry in
 * plugins/Nexo/sounds.yml. As a music disc, Nexo additionally registers the sound as a jukebox song
 * that an item can play via the jukebox_playable component.
 */
import type { Project } from '../../project/types';

export interface SoundFile {
  name: string;
  dataUrl: string;
  size: number;
}

export interface Sound {
  id: string;
  /** Name of the sound, e.g. "block.ruby.place" – used as <namespace>:<soundId> */
  soundId: string;
  /** One file – or several, of which a random one is played */
  files: SoundFile[];
  /** Stream long sounds (music) instead of loading them completely */
  stream: boolean;
  volume: number | null;
  pitch: number | null;
  /** Range in blocks (attenuation_distance) */
  distance: number | null;
  /** Register as a music disc (jukebox song) */
  jukebox: JukeboxSong | null;
}

export interface JukeboxSong {
  /** e.g. "2m 30s" or "150s" */
  duration: string;
  description: string;
  comparatorOutput: number | null;
  range: number | null;
}

export function createSound(id: string, soundId: string, files: SoundFile[]): Sound {
  return { id, soundId, files, stream: false, volume: null, pitch: null, distance: null, jukebox: null };
}

/** Full ID as used in item configs (e.g. block sounds) */
export function soundKey(project: Project, sound: Sound): string {
  return `${project.namespace}:${sound.soundId}`;
}
