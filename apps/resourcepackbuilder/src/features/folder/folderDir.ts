/** Where the item folders of a project end up on the server, as shown to users. */
import { getFolderSlugs, type Project } from '@resourcepackbuilder/core/project';
import { packTargetFor } from '@resourcepackbuilder/export';

/**
 * The server directory a folder's item configs go into (plugins/<plugin>/…), or the directory that holds the
 * top-level folders when `folderId` is null, e.g. "plugins/Nexo/items" or "plugins/CraftEngine/resources/<pack>/configuration/items".
 */
export function folderDirPath(project: Project, folderId: string | null): string {
  const { itemFile, layout } = packTargetFor(project);
  const file = itemFile(project, folderId ? getFolderSlugs(project, folderId) : [], { itemId: 'item' });
  return `${layout.pluginDir}/${file.slice(0, file.lastIndexOf('/'))}`;
}
