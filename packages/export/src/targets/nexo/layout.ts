/**
 * Where the Nexo export puts things inside plugins/Nexo:
 *   items/[<project>/]<folder…>/<folder|item_id>.yml, recipes/<type>/<project>.yml, glyphs/<project>.yml
 *   sounds.yml, paintings.yml (shared by all projects)
 *   pack/external_packs/<pack>/ or pack/external_packs/<pack>.zip (the resource pack)
 */
import { getFolderSlugs, type Project, projectFileName } from '@resourcepackbuilder/core/project';
import { exportPackName } from '../../paths';

/** The Nexo plugin folder on a server; every exported config file is relative to it. */
export const NEXO_PLUGIN_DIR = 'plugins/Nexo';

/** Reloads Nexo's configuration and rebuilds the resource pack (what the user runs after installing an export). */
export const NEXO_RELOAD_COMMAND = 'nexo reload all';

/** `relativePath` (e.g. "sounds.yml") inside the Nexo plugin folder, as shown to users. */
export function nexoPluginPath(relativePath: string): string {
  return `${NEXO_PLUGIN_DIR}/${relativePath}`;
}

/** YAML file (relative to plugins/Nexo) for items in the folder `folderSlugs`; `itemId` names it in "one file per item" mode. */
export function itemYamlFile(project: Project, folderSlugs: string[], itemId: string): string {
  const dir = ['items', ...(project.settings.itemsInProjectFolder ? [projectFileName(project)] : []), ...folderSlugs];
  const fileName = project.settings.yamlFileMode === 'item' ? itemId : (folderSlugs[folderSlugs.length - 1] ?? 'items');
  return `${dir.join('/')}/${fileName}.yml`;
}

/** YAML file of a folder's items; in "one file per item" mode with `itemPlaceholder` as file name. */
export function folderYamlFile(project: Project, folderId: string, itemPlaceholder = '<item_id>'): string {
  return itemYamlFile(project, getFolderSlugs(project, folderId), itemPlaceholder);
}

/** Location of the resource pack inside plugins/Nexo. */
export function packLocation(project: Project, asZip = project.settings.externalPackAsZip): string {
  const name = exportPackName(project);
  return asZip ? `pack/external_packs/${name}.zip` : `pack/external_packs/${name}/`;
}
