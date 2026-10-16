/**
 * Items that use a painting or a sound: the Nexo item config that hangs the painting (painting_variant)
 * or plays the sound in a jukebox (jukebox_playable).
 */
import { ID_CHARS } from '@resourcepackbuilder/minecraft';
import type { Item, Project } from '../types';
import { toIdentifier } from '@resourcepackbuilder/utils';
import { DEFAULT_MATERIAL } from '../item';
import type { Painting } from './painting';
import type { Sound } from './sound';
import { mediaKey } from './entry';

/** What a new item for a media entry starts with; `configure` adds its components. */
export interface MediaItemInput {
  displayName: string;
  /** Suggested item ID; made unique when the item is inserted */
  nexoId: string;
  material: string;
  configure: (item: Item) => void;
}

/** An item that hangs this painting (material PAINTING + painting_variant). */
export function paintingItem(project: Pick<Project, 'namespace'>, painting: Painting): MediaItemInput {
  return {
    displayName: painting.title || painting.paintingId,
    nexoId: painting.paintingId,
    material: 'PAINTING',
    configure: (item) => {
      item.config.Components = { painting_variant: mediaKey(project, painting.paintingId) };
    },
  };
}

/** A music disc that plays this sound in the jukebox (stack size 1 + jukebox_playable). */
export function musicDiscItem(project: Pick<Project, 'namespace'>, sound: Sound): MediaItemInput {
  return {
    displayName: sound.jukebox?.description || sound.soundId,
    nexoId: `${toIdentifier(sound.soundId, ID_CHARS, 'sound')}_disc`,
    material: DEFAULT_MATERIAL,
    configure: (item) => {
      item.config.Components = { max_stack_size: 1, jukebox_playable: { song_key: mediaKey(project, sound.soundId) } };
    },
  };
}
