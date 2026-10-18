/**
 * Texture atlases of a CraftEngine pack (`atlases`): which textures a vanilla or custom atlas holds as sprites.
 * CraftEngine reads the section from the configuration (AtlasParser), merges the sources of all entries with the
 * same atlas id and writes assets/<namespace>/atlases/<id>.json into the resource pack. Most packs need none; the
 * plugin repairs the common block and item atlas cases itself.
 *
 * The project keeps its atlases as a list (`atlases` of `Project.craftEngine`), each entry with its `id` (the atlas,
 * e.g. `minecraft:blocks`) and its `sources` (logic/atlasSources.ts).
 */
import { field, resolveFields } from '../form/build';
import type { ObjectListField } from '../form/fields';
import type { ConfigObject, Project } from '../project/types';
import { CE_ATLAS_SOURCES } from './logic';
import { entrySection } from './projectEntries';

/** The project's atlases (an empty list for a project without any). */
export const projectAtlases = (project: Pick<Project, 'craftEngine'>): ConfigObject[] => project.craftEngine?.atlases ?? [];

/** A new atlas entry: the vanilla block atlas with one texture */
export const newAtlas = (): ConfigObject => ({ id: 'minecraft:blocks', sources: [{ type: 'single', resource: '' }] });

const [atlasList] = resolveFields(
  {
    atlases: field.objectList(
      {
        id: field.text({ format: 'resource', placeholder: true, help: true }),
        sources: field.typedList('atlasSources', () => CE_ATLAS_SOURCES, { help: true }),
      },
      { titleKey: 'id', newItem: newAtlas },
    ),
  },
  'craftEngine',
);

/** The project's atlases as the editor edits them (messages at `craftEngine.fields.atlases` of ceSchema). */
export const CE_ATLAS_LIST = atlasList as ObjectListField;

/** The `atlases` section: each atlas with an id and sources under its key. */
export function craftEngineAtlases(project: Project): Record<string, ConfigObject> {
  const section = entrySection(project, projectAtlases(project), CE_ATLAS_LIST);
  return Object.fromEntries(Object.entries(section).filter(([, atlas]) => Array.isArray(atlas.sources) && atlas.sources.length > 0));
}
