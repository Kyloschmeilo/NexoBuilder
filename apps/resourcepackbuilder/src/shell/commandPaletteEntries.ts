/**
 * The searchable entries of the command palette that come from the project: items, folders and the project-wide
 * pages of the activities offered, plus the search ranking. The palette component adds the actions and the labels.
 */
import { type Folder, itemLabel, type PackTargetId, type Project } from '@resourcepackbuilder/core/project';
import type { Selection, ViewName } from '../store/ui';
import type { Activity } from './activities';
import { isViewOffered } from './sidebar/ViewEntries';

/** A folder as the palette lists it: its name and the names of the folders above it. */
export interface PaletteFolder {
  id: string;
  name: string;
  /** "Weapons / Swords" for a folder inside Weapons; '' on the top level */
  parentPath: string;
}

/** An item as the palette lists it. */
export interface PaletteItem {
  id: string;
  label: string;
  itemId: string;
  /** Path of the item's folder, e.g. "Weapons / Swords" */
  folderPath: string;
}

/** A page opened by an activity: a project-wide view or the settings page. */
export type PalettePage = { kind: 'view'; view: ViewName } | { kind: 'settings' };

/** Separator between folder names in a path. */
const PATH_SEPARATOR = ' / ';

/** The names from the top-level folder down to `folderId` (guarded against cycles). */
export function folderNames(project: Project, folderId: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  let current: Folder | undefined = project.folders[folderId];
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parentId ? project.folders[current.parentId] : undefined;
  }
  return names;
}

/** Every folder, in tree order (parents before their subfolders). */
export function paletteFolders(project: Project): PaletteFolder[] {
  const result: PaletteFolder[] = [];
  const seen = new Set<string>();
  const visit = (folderId: string) => {
    const folder = project.folders[folderId];
    if (!folder || seen.has(folderId)) return;
    seen.add(folderId);
    result.push({ id: folderId, name: folder.name, parentPath: folderNames(project, folderId).slice(0, -1).join(PATH_SEPARATOR) });
    folder.folderIds.forEach(visit);
  };
  project.rootFolderIds.forEach(visit);
  return result;
}

/** Every item, in tree order. */
export function paletteItems(project: Project): PaletteItem[] {
  return paletteFolders(project).flatMap(({ id: folderId }) => {
    const folderPath = folderNames(project, folderId).join(PATH_SEPARATOR);
    return (project.folders[folderId]?.itemIds ?? []).flatMap((id) => {
      const item = project.items[id];
      return item ? [{ id, label: itemLabel(item), itemId: item.itemId, folderPath }] : [];
    });
  });
}

/**
 * The pages of the offered activities: the views each lists (or opens) that projects of `target` have, and the
 * settings page, in bar order.
 */
export function palettePages(activities: readonly Activity[], target: PackTargetId): PalettePage[] {
  const pages: PalettePage[] = [];
  for (const activity of activities) {
    for (const view of activity.views) if (isViewOffered(view, target)) pages.push({ kind: 'view', view });
    if (activity.page?.kind === 'settings') pages.push({ kind: 'settings' });
  }
  return pages;
}

/**
 * The folder "New item" creates the item in: the selected folder, the selected item's folder, or else the first
 * top-level folder. Null while the project has no folder.
 */
export function newItemFolderId(project: Project, selection: Selection): string | null {
  if (selection?.kind === 'folder' && selection.id in project.folders) return selection.id;
  if (selection?.kind === 'item') {
    const folderId = project.items[selection.id]?.folderId;
    if (folderId && folderId in project.folders) return folderId;
  }
  return project.rootFolderIds.find((id) => id in project.folders) ?? null;
}

/**
 * How well an entry with these search texts matches `search` (cmdk calls it for every entry): 1 when a text starts
 * with the search, 0.5 when one contains it, 0 otherwise. Case-insensitive; an empty search matches everything.
 */
export function scorePaletteEntry(texts: readonly string[], search: string): number {
  const needle = search.trim().toLowerCase();
  if (!needle) return 1;
  let score = 0;
  for (const text of texts) {
    const haystack = text.toLowerCase();
    if (haystack.startsWith(needle)) return 1;
    if (haystack.includes(needle)) score = 0.5;
  }
  return score;
}
