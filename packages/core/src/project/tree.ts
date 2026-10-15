/** Hilfen rund um die Ordnerstruktur eines Projekts. */
import type { Folder, Item, Project } from '../types';
import { slugify } from '../util';
import { hasPath } from '../nexo/configPath';

export function folderSlug(folder: Folder): string {
  return slugify(folder.name, 'ordner');
}

/** Liefert die Ordnerkette von der Wurzel bis zum angegebenen Ordner. */
export function getFolderChain(project: Project, folderId: string): Folder[] {
  const chain: Folder[] = [];
  let current: Folder | undefined = project.folders[folderId];
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
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

/** Alle Items in Baumreihenfolge (Ordner für Ordner). */
export function getItemsInTreeOrder(project: Project): Item[] {
  const result: Item[] = [];
  const visit = (folderId: string) => {
    const folder = project.folders[folderId];
    if (!folder) return;
    for (const itemId of folder.itemIds) {
      const item = project.items[itemId];
      if (item) result.push(item);
    }
    for (const child of folder.folderIds) visit(child);
  };
  for (const root of project.rootFolderIds) visit(root);
  return result;
}

/** Alle Unterordner (rekursiv) eines Ordners inklusive des Ordners selbst. */
export function getDescendantFolderIds(project: Project, folderId: string): string[] {
  const result: string[] = [];
  const visit = (id: string) => {
    const folder = project.folders[id];
    if (!folder) return;
    result.push(id);
    folder.folderIds.forEach(visit);
  };
  visit(folderId);
  return result;
}

export function isBlockItem(item: Item): boolean {
  return hasPath(item.config, ['Mechanics', 'custom_block']);
}

export function isFurnitureItem(item: Item): boolean {
  return hasPath(item.config, ['Mechanics', 'furniture']);
}
