/**
 * The item browser categories of a CraftEngine pack (`categories:`), one per folder: a folder's category lists its
 * subfolders' categories (`#<id>`) first, then its items. Only top-level folders show in the browser itself; the
 * categories of subfolders are hidden and open from their parent. A category's icon is its first item (in tree order),
 * and folders without items (in them or below) get no category. The id is `<namespace>:<folder slugs joined by />`.
 */
import { folderSlug } from '../project/tree';
import type { Folder, Item, Project } from '../project/types';
import { craftEngineItemKey } from './itemConfig';

/** Builds the categories of the folders that hold any of `items` (the exported items of the project). */
export function craftEngineCategories(project: Project, items: Item[]): Record<string, Record<string, unknown>> {
  const exported = new Set(items.map((item) => item.id));
  const categories: Record<string, Record<string, unknown>> = {};
  const seen = new Set<string>();

  /** Adds the category of `folder` (and of its subfolders); returns its id and icon, null if it holds no item. */
  const visit = (folder: Folder, slugs: string[], topLevel: number | null): { id: string; icon: string } | null => {
    seen.add(folder.id);
    const path = [...slugs, folderSlug(folder)];
    const id = `${project.namespace}:${path.join('/')}`;
    // Reserves the place of the category before its subcategories, so a parent comes first in the file
    categories[id] = {};
    const subcategories = folder.folderIds.flatMap((childId) => {
      const child = project.folders[childId];
      const result = child && !seen.has(childId) ? visit(child, path, null) : null;
      return result ? [result] : [];
    });
    const itemKeys = folder.itemIds.flatMap((itemId) => {
      const item = project.items[itemId];
      return item && exported.has(itemId) ? [craftEngineItemKey(project, item)] : [];
    });
    const icon = itemKeys[0] ?? subcategories[0]?.icon;
    if (!icon) {
      delete categories[id];
      return null;
    }
    categories[id] = {
      name: `<!i>${folder.name.trim() || folderSlug(folder)}`,
      ...(topLevel === null ? { hidden: true } : { priority: topLevel }),
      icon,
      list: [...subcategories.map((sub) => `#${sub.id}`), ...itemKeys],
    };
    return { id, icon };
  };

  let priority = 0;
  for (const id of project.rootFolderIds) {
    const folder = project.folders[id];
    if (folder && !seen.has(id) && visit(folder, [], priority + 1)) priority++;
  }
  return categories;
}
