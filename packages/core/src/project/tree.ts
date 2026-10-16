/** Helpers around the folder structure of a project (all guarded against folder cycles). */
import { hasPath, isPlainObject, slugify } from '@resourcepackbuilder/utils';
import type { PackTargetId } from './target';
import type { Folder, Item, Project } from './types';

export function folderSlug(folder: Folder): string {
  return slugify(folder.name, 'folder');
}

/** Returns the folder chain from the root to the given folder. */
function getFolderChain(project: Project, folderId: string): Folder[] {
  const chain: Folder[] = [];
  let current: Folder | undefined = project.folders[folderId];
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? project.folders[current.parentId] : undefined;
  }
  return chain;
}

export function getFolderSlugs(project: Project, folderId: string): string[] {
  return getFolderChain(project, folderId).map(folderSlug);
}

export function getFolderPathLabel(project: Project, folderId: string): string {
  return getFolderChain(project, folderId)
    .map((f) => f.name)
    .join(' / ');
}

/** Visits the folders below `rootIds` depth-first (each folder at most once); `depth` counts from 0 at `rootIds`. */
function walkFolders(project: Project, rootIds: string[], visit: (folder: Folder, depth: number) => void): void {
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    const folder = project.folders[id];
    if (!folder || seen.has(id)) return;
    seen.add(id);
    visit(folder, depth);
    folder.folderIds.forEach((child) => walk(child, depth + 1));
  };
  rootIds.forEach((id) => walk(id, 0));
}

/** All folders in tree order with their depth (top level: 0). */
export function flattenFolderTree(project: Project): Array<{ folder: Folder; depth: number }> {
  const result: Array<{ folder: Folder; depth: number }> = [];
  walkFolders(project, project.rootFolderIds, (folder, depth) => result.push({ folder, depth }));
  return result;
}

/** All items in tree order (folder by folder). */
export function getItemsInTreeOrder(project: Project): Item[] {
  const result: Item[] = [];
  walkFolders(project, project.rootFolderIds, (folder) => {
    for (const itemId of folder.itemIds) {
      const item = project.items[itemId];
      if (item) result.push(item);
    }
  });
  return result;
}

/** All subfolders (recursive) of a folder including the folder itself. */
export function getDescendantFolderIds(project: Project, folderId: string): string[] {
  const result: string[] = [];
  walkFolders(project, [folderId], (folder) => result.push(folder.id));
  return result;
}

/** All items in a folder and its subfolders. */
export function itemIdsInFolder(project: Project, folderId: string): string[] {
  const result: string[] = [];
  walkFolders(project, [folderId], (folder) => result.push(...folder.itemIds.filter((itemId) => project.items[itemId])));
  return result;
}

/**
 * Whether the item places a custom block, so its model and textures go to models/block and textures/block (the
 * block atlas). Nexo: the custom_block mechanic; CraftEngine: a block definition (an object) in `block`, the same rule
 * as craftEngineBlock in core/craftEngine.
 */
export function isBlockItem(item: Item, target: PackTargetId): boolean {
  return target === 'craftengine' ? isPlainObject(item.config.block) : hasPath(item.config, ['Mechanics', 'custom_block']);
}
