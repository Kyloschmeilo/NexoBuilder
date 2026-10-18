/**
 * The item browser categories of a CraftEngine pack (`categories:`, the `/ce` item browser).
 *
 * The project's own categories (`categories` of `Project.craftEngine`) are a list, each entry with its `id`, `name`,
 * `lore`, `icon`, `priority`, `hidden`, `conditions` and `source` (a list of category sources, written as one source
 * when there is one). Items add themselves to categories with their root key `category`.
 *
 * With the project setting `ceCategoriesFromFolders`, the export also writes one category per folder: a folder's
 * category lists its subfolders' categories (`#<id>`) first, then its items. Only top-level folders show in the browser itself; the
 * categories of subfolders are hidden and open from their parent. A category's icon is its first item (in tree order),
 * and folders without items (in them or below) get no category. The id is `<namespace>:<folder slugs joined by />`;
 * a folder whose slug a sibling before it already has gets `-2`, `-3`, … appended, so every category id is unique.
 */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, resolveFields } from '../form/build';
import type { ObjectListField } from '../form/fields';
import { type Option, plainOptions } from '../form/options';
import { pruneValue } from '../form/prune';
import { folderSlug } from '../project/tree';
import type { ConfigObject, Folder, Item, Project } from '../project/types';
import { CE_CATEGORY_SOURCES } from './logic';
import { gate } from './logic/shared';
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

/* ====================================================================== Project categories */

/** The project's own categories (an empty list for a project without any). */
export const projectCategories = (project: Pick<Project, 'craftEngine'>): ConfigObject[] => project.craftEngine?.categories ?? [];

/** Ids a category can have: a resource location, its namespace optional */
export const CE_CATEGORY_ID = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

/** The id of a category entry ('' without one). */
export const categoryEntryId = (entry: ConfigObject): string => (typeof entry.id === 'string' ? entry.id.trim() : '');

/** The key a category is written under: its id as written, in the project's namespace when it names none. */
export function categoryKey(project: Pick<Project, 'namespace'>, id: string): string {
  const trimmed = id.trim();
  return trimmed.includes(':') ? trimmed : formatResourceLocation(project.namespace, trimmed);
}

/** A new category: an id to fill in and a list source */
export const newCategory = (): ConfigObject => ({ id: '', name: '', icon: 'minecraft:stone', source: [{ type: 'list', list: [] }] });

const [categoryList] = resolveFields(
  {
    categories: field.objectList(
      {
        id: field.text({ placeholder: true, help: true }),
        name: field.text({ format: 'minimessage', placeholder: true, help: true }),
        lore: field.stringList({ format: 'minimessage', placeholder: true }),
        icon: field.text({ format: 'resource', placeholder: true, help: true }),
        priority: field.number({ integer: true, help: true }),
        hidden: field.boolean({ defaultHint: false, help: true }),
        conditions: gate(),
        source: field.typedList('categorySources', () => CE_CATEGORY_SOURCES, { help: true }),
      },
      { titleKey: 'id', newItem: newCategory },
    ),
  },
  'craftEngine',
);

/** The project's categories as the editor edits them (messages at `craftEngine.fields.categories` of ceSchema). */
export const CE_CATEGORY_LIST = categoryList as ObjectListField;

/** The entries with an id, each under its key (a later entry with a taken key is left out). */
function writtenCategories(project: Project): Map<string, ConfigObject> {
  const result = new Map<string, ConfigObject>();
  for (const entry of projectCategories(project)) {
    const id = categoryEntryId(entry);
    if (!id) continue;
    const key = categoryKey(project, id);
    if (!result.has(key)) result.set(key, entry);
  }
  return result;
}

/**
 * The project's own categories by key: pruned by the editor's fields, without their `id`, a single source written
 * as that source.
 */
export function craftEngineProjectCategories(project: Project): Record<string, ConfigObject> {
  const section: Record<string, ConfigObject> = {};
  for (const [key, entry] of writtenCategories(project)) {
    const pruned = pruneValue([entry], CE_CATEGORY_LIST);
    if (!Array.isArray(pruned) || !isPlainObject(pruned[0])) continue;
    const category = { ...(pruned[0] as ConfigObject) };
    delete category.id;
    if (Array.isArray(category.source) && category.source.length === 1) category.source = category.source[0];
    section[key] = category;
  }
  return section;
}

/** The project's categories as suggestions (by key) for an item's `category`. */
export function projectCategoryOptions(project: Project): Option[] {
  return plainOptions([...writtenCategories(project).keys()]);
}

/** What a list source can name: the project's items by key, then its categories as `#<key>`. */
export function projectCategoryMemberOptions(project: Project): Option[] {
  const items = Object.values(project.items).map((item) => craftEngineItemKey(project, item));
  return plainOptions([...items, ...[...writtenCategories(project).keys()].map((key) => `#${key}`)]);
}
