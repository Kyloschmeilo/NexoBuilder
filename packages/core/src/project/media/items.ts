/**
 * Items that use a painting or a sound: the item config that hangs the painting (painting_variant) or plays the
 * sound in a jukebox (jukebox_playable). Nexo items get them as `Components`; CraftEngine items as `data`, where the
 * stack size goes through the raw `data.components` map since CraftEngine has no processor of its own for it.
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
  itemId: string;
  material: string;
  configure: (item: Item) => void;
}

/** An item that hangs this painting (material PAINTING + painting_variant). */
export function paintingItem(project: Pick<Project, 'namespace' | 'target'>, painting: Painting): MediaItemInput {
  return {
    displayName: painting.title || painting.paintingId,
    itemId: painting.paintingId,
    material: 'PAINTING',
    configure: (item) => {
      const variant = mediaKey(project, painting.paintingId);
      if (project.target === 'craftengine') item.config.data = { painting_variant: variant };
      else item.config.Components = { painting_variant: variant };
    },
  };
}

/** A music disc that plays this sound in the jukebox (stack size 1 + jukebox_playable). */
export function musicDiscItem(project: Pick<Project, 'namespace' | 'target'>, sound: Sound): MediaItemInput {
  return {
    displayName: sound.jukebox?.description || sound.soundId,
    itemId: `${toIdentifier(sound.soundId, ID_CHARS, 'sound')}_disc`,
    material: DEFAULT_MATERIAL,
    configure: (item) => {
      const song = mediaKey(project, sound.soundId);
      if (project.target === 'craftengine') {
        item.config.data = { jukebox_playable: song, components: { 'minecraft:max_stack_size': 1 } };
      } else {
        item.config.Components = { max_stack_size: 1, jukebox_playable: { song_key: song } };
      }
    },
  };
}
