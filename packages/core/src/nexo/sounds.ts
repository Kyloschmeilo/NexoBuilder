/**
 * Custom sounds (Nexo: configuration/sounds) – OGG files in the resource pack plus an entry in
 * plugins/Nexo/sounds.yml. With "Musik-CD", Nexo additionally registers the sound as a jukebox song
 * that an item can play via the "Schallplatte" component (jukebox_playable).
 */
import type { Issue, Project } from '../types';
import { base64ToBytes } from '../util';

export interface SoundFile {
  name: string;
  dataUrl: string;
  size: number;
}

export interface Sound {
  id: string;
  /** Name of the sound, e.g. "block.rubin.place" – used as <namespace>:<soundId> */
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

export const SOUND_ID_PATTERN = /^[a-z0-9_.-]+$/;

export function createSound(id: string, soundId: string, files: SoundFile[]): Sound {
  return { id, soundId, files, stream: false, volume: null, pitch: null, distance: null, jukebox: null };
}

/** Full ID as used in item configs (e.g. block sounds) */
export function soundKey(project: Project, sound: Sound): string {
  return `${project.namespace}:${sound.soundId}`;
}

/** Path of the OGG file relative to assets/<ns>/sounds (without extension) */
export function soundFilePath(sound: Sound, index: number): string {
  const base = sound.soundId.split('.').filter(Boolean).join('/') || 'sound';
  return sound.files.length > 1 ? `${base}_${index + 1}` : base;
}

export function isOgg(dataUrl: string): boolean {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return false;
  try {
    const head = base64ToBytes(dataUrl.slice(comma + 1, comma + 1 + 8));
    return String.fromCharCode(...head.slice(0, 4)) === 'OggS';
  } catch {
    return false;
  }
}

/** Entry for sounds.yml */
export function soundToYaml(project: Project, sound: Sound): Record<string, unknown> {
  const ns = project.namespace;
  const refs = sound.files.map((_, i) => `${ns}:${soundFilePath(sound, i)}`);
  const out: Record<string, unknown> = { id: soundKey(project, sound) };
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

const DURATION_PATTERN = /^\s*\d+(\.\d+)?\s*[tsmhd]?(\s+\d+(\.\d+)?\s*[tsmhd])*\s*$/;

export function validateSounds(project: Project): Array<Issue & { soundId: string }> {
  const issues: Array<Issue & { soundId: string }> = [];
  const seen = new Set<string>();
  for (const sound of project.sounds ?? []) {
    const add = (level: Issue['level'], message: string) =>
      issues.push({ level, message: `Sound „${sound.soundId || '?'}“: ${message}`, soundId: sound.id });
    if (!SOUND_ID_PATTERN.test(sound.soundId)) add('error', 'Der Name darf nur Kleinbuchstaben, Zahlen sowie _ . - enthalten (z.B. block.rubin.place).');
    if (seen.has(sound.soundId)) add('error', 'Diesen Namen hat schon ein anderer Sound.');
    seen.add(sound.soundId);
    if (sound.files.length === 0) add('error', 'Es wurde noch keine OGG-Datei hochgeladen.');
    for (const file of sound.files) {
      if (!isOgg(file.dataUrl)) add('error', `„${file.name}“ ist keine OGG-Datei. Minecraft spielt nur .ogg (Vorbis) ab.`);
    }
    if (sound.volume !== null && (sound.volume <= 0 || sound.volume > 10)) add('warning', 'Die Lautstärke sollte zwischen 0 und 1 liegen (größer als 1 erhöht nur die Reichweite).');
    if (sound.jukebox) {
      if (!DURATION_PATTERN.test(sound.jukebox.duration)) add('error', 'Bei der Musik-CD fehlt die Länge des Liedes (z.B. 2m 30s oder 150s).');
      const output = sound.jukebox.comparatorOutput;
      if (output !== null && (output < 0 || output > 15 || !Number.isInteger(output))) add('error', 'Das Komparator-Signal muss zwischen 0 und 15 liegen.');
      if (!sound.stream && sound.files.some((f) => f.size > 1_000_000)) add('info', 'Lange Lieder besser „streamen“ – dann lädt Minecraft sie nicht komplett in den Speicher.');
    }
  }
  return issues;
}
