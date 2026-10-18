/** What the sidebar derives from the project and its plan once per change, instead of once per row. */
import { hasPath, isPlainObject, type Issue, type IssueTarget } from '@resourcepackbuilder/utils';
import { isBlockItem, type Item, itemLabel, type PackTargetId, type Project } from '@resourcepackbuilder/core/project';

/** Issue levels the sidebar marks; hints (`info`) are not shown there. */
export type MarkedLevel = 'error' | 'warning';

/** Everything a tree row needs besides its own entry. */
export interface SidebarTree {
  project: Project;
  itemCounts: Map<string, number>;
  itemLevels: Map<string, MarkedLevel>;
  /** While searching or filtering: the matching items and the folders holding them; null otherwise */
  search: { items: Set<string>; folders: Set<string> } | null;
}

/** What an item places in the world: nothing (a plain item), a custom block or furniture. */
export type ItemKind = 'item' | 'block' | 'furniture';

/**
 * The kind of `item`. A block wins over furniture, as in the CraftEngine export. Nexo: the custom_block or furniture
 * mechanic; CraftEngine: a block or furniture definition (an object) in `block` or `furniture`.
 */
export function itemKindOf(item: Item, target: PackTargetId): ItemKind {
  if (isBlockItem(item, target)) return 'block';
  const isFurniture = target === 'craftengine' ? isPlainObject(item.config.furniture) : hasPath(item.config, ['Mechanics', 'furniture']);
  return isFurniture ? 'furniture' : 'item';
}

/** The filter chips of the items panel: everything, one kind, or the items with errors or warnings. */
export const TREE_FILTERS = ['all', 'items', 'blocks', 'furniture', 'issues'] as const;
export type TreeFilter = (typeof TREE_FILTERS)[number];

const FILTER_KINDS: Partial<Record<TreeFilter, ItemKind>> = { items: 'item', blocks: 'block', furniture: 'furniture' };

/**
 * Ids of the items matching the search `query` (see {@link searchItems}) and the chip `filter`; null while neither
 * narrows anything. `levels` are the marked issue levels by item id, for the "with issues" chip.
 */
export function filterItems(project: Project, query: string, filter: TreeFilter, levels: Map<string, MarkedLevel>): Set<string> | null {
  const hits = searchItems(project, query);
  if (filter === 'all') return hits;
  const kind = FILTER_KINDS[filter];
  const matches = (item: Item) => (kind ? itemKindOf(item, project.target) === kind : levels.has(item.id));
  const result = new Set<string>();
  for (const item of Object.values(project.items)) {
    if ((!hits || hits.has(item.id)) && matches(item)) result.add(item.id);
  }
  return result;
}

/** Number of items in each folder, subfolders included. */
export function countItemsPerFolder(project: Project): Map<string, number> {
  const counts = new Map<string, number>();
  const visit = (folderId: string, path: Set<string>): number => {
    const known = counts.get(folderId);
    if (known !== undefined) return known;
    const folder = project.folders[folderId];
    if (!folder || path.has(folderId)) return 0;
    path.add(folderId);
    const own = folder.itemIds.filter((id) => id in project.items).length;
    const count = folder.folderIds.reduce((sum, childId) => sum + visit(childId, path), own);
    path.delete(folderId);
    counts.set(folderId, count);
    return count;
  };
  for (const folderId of Object.keys(project.folders)) visit(folderId, new Set());
  return counts;
}

/** Ids of the items whose name or id contains `query` (case-insensitive); null for an empty query. */
export function searchItems(project: Project, query: string): Set<string> | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  const hits = new Set<string>();
  for (const item of Object.values(project.items)) {
    if (itemLabel(item).toLowerCase().includes(needle) || item.itemId.includes(needle)) hits.add(item.id);
  }
  return hits;
}

/** The folders holding one of `itemIds`, directly or in a subfolder. */
export function foldersContaining(project: Project, itemIds: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const itemId of itemIds) {
    let folderId: string | null = project.items[itemId]?.folderId ?? null;
    while (folderId && !result.has(folderId)) {
      result.add(folderId);
      folderId = project.folders[folderId]?.parentId ?? null;
    }
  }
  return result;
}

/** The worst marked level of the issues of each target of `kind`, by target id. */
export function levelsByTarget(issues: Issue[], kind: IssueTarget['kind']): Map<string, MarkedLevel> {
  const levels = new Map<string, MarkedLevel>();
  for (const issue of issues) {
    if (issue.target?.kind !== kind || issue.level === 'info') continue;
    if (issue.level === 'error' || !levels.has(issue.target.id)) levels.set(issue.target.id, issue.level);
  }
  return levels;
}

/** The worst marked level among `levels`, or null when there is none. */
export function worstLevel(levels: Iterable<MarkedLevel>): MarkedLevel | null {
  let worst: MarkedLevel | null = null;
  for (const level of levels) {
    if (level === 'error') return 'error';
    worst = level;
  }
  return worst;
}
