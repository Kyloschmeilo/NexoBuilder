/**
 * Where the CraftEngine export puts things inside plugins/CraftEngine (one pack per project):
 *   resources/<pack>/pack.yml
 *   resources/<pack>/configuration/items/<folder…>/<folder|item_id>.yml
 *   resources/<pack>/configuration/{images,sounds,paintings}.yml (glyphs with their emoji, sounds with their jukebox songs)
 *   resources/<pack>/configuration/{equipments,categories}.yml (the armor sets, a category per folder)
 *   resources/<pack>/configuration/lang/<locale>.yml (the items' display name translations)
 *   resources/<pack>/resourcepack/ (the resource pack: pack.mcmeta, pack.png, assets/…)
 * The test server's CraftEngine adapter accepts exactly these paths.
 */
import type { MediaKind, Project } from '@resourcepackbuilder/core/project';
import { exportPackName } from '../../paths';

/** The CraftEngine plugin folder on a server; every exported config file is relative to it. */
export const CRAFT_ENGINE_PLUGIN_DIR = 'plugins/CraftEngine';

/** Reloads CraftEngine's configuration and rebuilds the resource pack. */
export const CRAFT_ENGINE_RELOAD_COMMAND = 'ce reload all';

/** CraftEngine's own packs in resources/ ("default", "default_assets", "internal" …); a project may not use their names. */
export const CRAFT_ENGINE_RESERVED_PACK_NAME = /^(default_.*|default|internal)$/i;

/** The project's pack folder relative to plugins/CraftEngine, e.g. "resources/golden". */
export function craftEnginePackDir(project: Project): string {
  return `resources/${exportPackName(project)}`;
}

/** The pack's pack.yml relative to plugins/CraftEngine. */
export function packYmlFile(project: Project): string {
  return `${craftEnginePackDir(project)}/pack.yml`;
}

/** The media config files: images.yml (with the emoji), sounds.yml (with the jukebox songs), paintings.yml. */
export const CRAFT_ENGINE_MEDIA_FILES = { glyph: 'images', sound: 'sounds', painting: 'paintings' } as const satisfies Record<
  MediaKind,
  string
>;

/** A config file of the pack (relative to plugins/CraftEngine), e.g. "resources/golden/configuration/categories.yml". */
export function craftEngineConfigFile(project: Project, name: string): string {
  return `${craftEnginePackDir(project)}/configuration/${name}.yml`;
}

/** A config file of the pack's media (relative to plugins/CraftEngine), e.g. "resources/golden/configuration/images.yml". */
export function craftEngineMediaFile(project: Project, name: (typeof CRAFT_ENGINE_MEDIA_FILES)[MediaKind]): string {
  return craftEngineConfigFile(project, name);
}

/** Config file (relative to plugins/CraftEngine) for items in the folder `folderSlugs`; `itemId` names it in "one file per item" mode. */
export function craftEngineItemFile(project: Project, folderSlugs: string[], itemId: string): string {
  const dir = [craftEnginePackDir(project), 'configuration', 'items', ...folderSlugs];
  const fileName = project.settings.yamlFileMode === 'item' ? itemId : (folderSlugs[folderSlugs.length - 1] ?? 'items');
  return `${dir.join('/')}/${fileName}.yml`;
}

/** Location of the resource pack inside plugins/CraftEngine; CraftEngine reads it as a folder only. */
export function craftEnginePackLocation(project: Project): string {
  return `${craftEnginePackDir(project)}/resourcepack/`;
}
