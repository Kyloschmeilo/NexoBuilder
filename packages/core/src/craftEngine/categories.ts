/**
 * The item browser categories of a CraftEngine pack (`categories:`), one per folder: a folder's category lists its
 * subfolders' categories (`#<id>`) first, then its items. Only top-level folders show in the browser itself; the
 * categories of subfolders are hidden and open from their parent. A category's icon is its first item (in tree order),
 * and folders without items (in them or below) get no category. The id is `<namespace>:<folder slugs joined by />`;
 * a folder whose slug a sibling before it already has gets `-2`, `-3`, … appended, so every category id is unique.
 */
import { folderSlug } from '../project/tree';
import type { Folder, Item, Project } from '../project/types';
import { craftEngineItemKey } from './yaml';

/** Builds the categories of the folders that hold any of `items` (the exported items of the project). */
export function craftEngineCategories(project: Project, items: Item[]): Record<string, Record<string, unknown>> {
  const exported = new Set(items.map((item) => item.id));
  const categories: Record<string, Record<string, unknown>> = {};
  const seen = new Set<string>();

  /** Returns a slug for `folder` that no sibling in `taken` has yet, and reserves it. */
  const uniqueSlug = (folder: Folder, taken: Set<string>): string => {
    const base = folderSlug(folder);
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    return slug;
  };

  /** Adds the category of `folder` (and of its subfolders); returns its id and icon, null if it holds no item. */
  const visit = (folder: Folder, path: string[], topLevel: number | null): { id: string; icon: string } | null => {
    seen.add(folder.id);
    const id = `${project.namespace}:${path.join('/')}`;
    // Reserves the place of the category before its subcategories, so a parent comes first in the file
    categories[id] = {};
    const childSlugs = new Set<string>();
    const subcategories = folder.folderIds.flatMap((childId) => {
      const child = project.folders[childId];
      const result = child && !seen.has(childId) ? visit(child, [...path, uniqueSlug(child, childSlugs)], null) : null;
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
  const rootSlugs = new Set<string>();
  for (const id of project.rootFolderIds) {
    const folder = project.folders[id];
    if (folder && !seen.has(id) && visit(folder, [uniqueSlug(folder, rootSlugs)], priority + 1)) priority++;
  }
  return categories;
}
