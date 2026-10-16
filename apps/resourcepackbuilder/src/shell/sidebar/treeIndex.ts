/** What the sidebar derives from the project and its plan once per change, instead of once per row. */
import type { Issue, IssueTarget } from '@resourcepackbuilder/utils';
import { itemLabel, type Project } from '@resourcepackbuilder/core/project';

/** Issue levels the sidebar marks; hints (`info`) are not shown there. */
export type MarkedLevel = 'error' | 'warning';

/** Everything a tree row needs besides its own entry. */
export interface SidebarTree {
  project: Project;
  itemCounts: Map<string, number>;
  itemLevels: Map<string, MarkedLevel>;
  /** While searching: the matching items and the folders holding them; null otherwise */
  search: { items: Set<string>; folders: Set<string> } | null;
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
    if (itemLabel(item).toLowerCase().includes(needle) || item.nexoId.includes(needle)) hits.add(item.id);
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
