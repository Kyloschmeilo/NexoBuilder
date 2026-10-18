/**
 * Custom sounds (Nexo: configuration/sounds) – OGG files in the resource pack plus an entry in
 * plugins/Nexo/sounds.yml. As a music disc, Nexo additionally registers the sound as a jukebox song
 * that an item can play via the jukebox_playable component.
 */
import type { Project } from '../types';
import { mediaKey } from './entry';

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
  /** Load the sound when the pack loads instead of when it is first played (`preload`) */
  preload: boolean;
  /** How likely each file is picked compared to other entries of the event (`weight`, default 1) */
  weight: number | null;
  /** Replace the vanilla sound event of the same name instead of adding to it (`replace`); the event is then minecraft:<soundId> */
  replace: boolean;
  /** Translation key of the subtitle (`subtitle`) */
  subtitle: string;
  /** Another sound event that this event plays (an entry of `type: event`) */
  reference: string;
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
  return {
    id,
    soundId,
    files,
    stream: false,
    volume: null,
    pitch: null,
    distance: null,
    preload: false,
    weight: null,
    replace: false,
    subtitle: '',
    reference: '',
    jukebox: null,
  };
}

export function createJukeboxSong(): JukeboxSong {
  return { duration: '', description: '', comparatorOutput: null, range: null };
}

/** Registers the sound as a jukebox song – streamed, because music is long – or unregisters it (mutates). */
export function setSoundJukebox(sound: Sound, enabled: boolean): void {
  sound.jukebox = enabled ? (sound.jukebox ?? createJukeboxSong()) : null;
  if (enabled) sound.stream = true;
}

/** Namespace of the vanilla sound events a replacing sound overrides. */
const VANILLA_NAMESPACE = 'minecraft';

/**
 * Full ID of the sound event: "<namespace>:<soundId>", or "minecraft:<soundId>" for a sound that replaces a vanilla
 * sound event. Its OGG files stay in the project's namespace.
 */
export function soundEventKey(project: Pick<Project, 'namespace'>, sound: Pick<Sound, 'soundId' | 'replace'>): string {
  return mediaKey(sound.replace ? { namespace: VANILLA_NAMESPACE } : project, sound.soundId);
}

/** Path of the OGG file relative to assets/<ns>/sounds (without extension) */
export function soundFilePath(sound: Sound, index: number): string {
  const base = sound.soundId.split('.').filter(Boolean).join('/') || 'sound';
  return sound.files.length > 1 ? `${base}_${index + 1}` : base;
}

const DURATION_UNITS: Record<string, number> = { t: 0.05, s: 1, m: 60, h: 3600, d: 86400 };
/** Longer texts are no song length anyone types */
const MAX_DURATION_LENGTH = 64;

/**
 * Seconds of a song duration like "2m 30s", "2m30s", "150s", "150" (seconds) or "3000t"; null when it cannot be read.
 * The sound validation and the export both read durations with it.
 */
export function durationSeconds(text: string): number | null {
  const input = text.trim();
  if (!input || input.length > MAX_DURATION_LENGTH) return null;
  // One part per step (sticky, so every step must start where the last ended): linear, no backtracking
  const part = /(\d+(?:\.\d+)?)\s*([tsmhd]?)\s*/y;
  let seconds = 0;
  while (part.lastIndex < input.length) {
    const match = part.exec(input);
    if (!match) return null;
    seconds += Number(match[1]) * DURATION_UNITS[match[2] || 's'];
  }
  return Math.round(seconds * 1000) / 1000;
}
