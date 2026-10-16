/**
 * Export selection: export only certain folders, items and glyphs of a project
 * and pack multiple projects together into one ZIP.
 *
 * For the selection, a sub-project with the same folders (just without the deselected
 * items) is created – paths and file names thus stay exactly as in the full export.
 */
import { inContext, issueReporter, type Issue, type IssueCode, type MessageArgs } from '@resourcepackbuilder/utils';
import { MEDIA_KIND_LIST, MEDIA_KINDS, mapMediaLists, mediaGlobalId, mediaList, type MediaKind } from '../project/media/kinds';
import type { Project } from '../project/types';
import { projectFrame } from '../project/issueFrames';
import { projectFileName } from '../project/factory';
import { planExport } from './plan';
import type { ExportPlan, PlanOptions } from './types';

/** What is deselected gets stored – this way new items are included automatically. */
export interface ExportSelection {
  excludedItemIds: string[];
  excludedGlyphIds: string[];
  excludedSoundIds?: string[];
  excludedPaintingIds?: string[];
}

export const SELECT_ALL: ExportSelection = { excludedItemIds: [], excludedGlyphIds: [] };

/** The deselected IDs of one media list. */
function excludedIds(selection: ExportSelection | undefined, kind: MediaKind): Set<string> {
  return new Set(selection?.[MEDIA_KINDS[kind].excludedKey] ?? []);
}

/** The entries of one media list that the selection keeps. */
function selectedEntries<K extends MediaKind>(project: Project, selection: ExportSelection | undefined, kind: K) {
  const excluded = excludedIds(selection, kind);
  return mediaList(project, kind).filter((entry) => !excluded.has(entry.id));
}

/** A selection that leaves out everything of `project`. */
export function selectNothing(project: Project): ExportSelection {
  const selection: ExportSelection = { excludedItemIds: Object.keys(project.items), excludedGlyphIds: [] };
  for (const kind of MEDIA_KIND_LIST) selection[MEDIA_KINDS[kind].excludedKey] = mediaList(project, kind).map((e) => e.id);
  return selection;
}

function isEverythingSelected(selection: ExportSelection): boolean {
  return selection.excludedItemIds.length === 0 && MEDIA_KIND_LIST.every((kind) => !selection[MEDIA_KINDS[kind].excludedKey]?.length);
}

/** Number of selected items, glyphs, sounds and paintings. */
export function countSelected(
  project: Project,
  selection: ExportSelection | undefined,
): { items: number; glyphs: number; sounds: number; paintings: number } {
  const excludedItems = new Set(selection?.excludedItemIds ?? []);
  const lists = mapMediaLists((kind) => selectedEntries(project, selection, kind));
  return {
    items: Object.keys(project.items).filter((id) => !excludedItems.has(id)).length,
    glyphs: lists.glyphs.length,
    sounds: lists.sounds.length,
    paintings: lists.paintings.length,
  };
}

/**
 * Sub-project with the selected items and glyphs. Folders without selected items
 * are dropped, all others keep their name and order.
 */
export function selectFromProject(project: Project, selection: ExportSelection | undefined): Project {
  if (!selection || isEverythingSelected(selection)) return project;
  const excludedItems = new Set(selection.excludedItemIds);

  const items: Project['items'] = {};
  for (const [id, item] of Object.entries(project.items)) {
    if (!excludedItems.has(id)) items[id] = item;
  }

  // Keep folders in which something (also further down) is still selected
  const keep = new Map<string, boolean>();
  const visit = (id: string, guard: Set<string>): boolean => {
    const known = keep.get(id);
    if (known !== undefined) return known;
    const folder = project.folders[id];
    if (!folder || guard.has(id)) return false;
    guard.add(id);
    let result = folder.itemIds.some((itemId) => items[itemId]);
    for (const child of folder.folderIds) result = visit(child, guard) || result;
    keep.set(id, result);
    return result;
  };
  for (const id of Object.keys(project.folders)) visit(id, new Set());

  const folders: Project['folders'] = {};
  for (const [id, folder] of Object.entries(project.folders)) {
    if (!keep.get(id)) continue;
    folders[id] = {
      ...folder,
      folderIds: folder.folderIds.filter((child) => keep.get(child)),
      itemIds: folder.itemIds.filter((itemId) => items[itemId]),
    };
  }

  return {
    ...project,
    items,
    folders,
    rootFolderIds: project.rootFolderIds.filter((id) => keep.get(id)),
    ...mapMediaLists((kind) => selectedEntries(project, selection, kind)),
  };
}

/* ====================================================================== multiple projects */

export interface ExportEntry {
  project: Project;
  selection?: ExportSelection;
}

export interface PlannedProject {
  /** Sub-project (only the selection, possibly with adjusted settings) */
  project: Project;
  plan: ExportPlan;
}

export interface MultiExportPlan {
  projects: PlannedProject[];
  /** All issues; with multiple projects each carries its project (`projectId` and a context frame) */
  issues: Issue[];
}

/**
 * Plans the combined export. With multiple projects, the items of each project always end up in
 * items/<project>/ (`itemsInProjectFolder` is switched on for the export, whatever the project
 * setting says) so that folders with the same name do not overwrite each other. Overlaps between
 * the projects (item IDs, pack names, files) are reported as errors.
 */
export function planMultiExport(entries: ExportEntry[], options: PlanOptions = {}): MultiExportPlan {
  const multiple = entries.length > 1;
  const projects: PlannedProject[] = entries.map(({ project, selection }) => {
    let subset = selectFromProject(project, selection);
    if (multiple && !subset.settings.itemsInProjectFolder) {
      subset = { ...subset, settings: { ...subset.settings, itemsInProjectFolder: true } };
    }
    return { project: subset, plan: planExport(subset, options) };
  });

  if (!multiple) return { projects, issues: projects[0]?.plan.issues ?? [] };

  const issues: Issue[] = projects.flatMap(({ project, plan }) =>
    plan.issues.map((issue) => ({ ...inContext(issue, [projectFrame(project)]), projectId: project.id })),
  );
  issues.push(...crossProjectIssues(projects));
  return { projects, issues };
}

function crossProjectIssues(projects: PlannedProject[]): Issue[] {
  const issues: Issue[] = [];
  const report = issueReporter(issues);
  const error = (code: IssueCode, args: MessageArgs) => report('error', code, args);

  // Remembers the first project (index) per key and returns its name on overlap
  const firstOwner = <K>(map: Map<K, number>, key: K, owner: number): string | null => {
    const other = map.get(key);
    if (other === undefined) map.set(key, owner);
    return other !== undefined && other !== owner ? projects[other].project.name : null;
  };

  const packNames = new Map<string, number>();
  const nexoIds = new Map<string, number>();
  const mediaIds: Record<MediaKind, Map<string, number>> = { glyph: new Map(), sound: new Map(), painting: new Map() };
  const pluginFiles = new Map<string, number>();
  const assetFiles = new Map<string, number>();
  const reportedAssets = new Set<string>();
  const reportedFilePairs = new Set<string>();

  projects.forEach(({ project, plan }, index) => {
    const name = project.name;
    const pack = project.settings.packName;
    const otherPack = firstOwner(packNames, pack.toLowerCase(), index);
    if (otherPack) {
      error('selection.packNameClash', { first: otherPack, second: name, pack });
    }
    for (const { item } of plan.items) {
      const other = firstOwner(nexoIds, item.nexoId, index);
      if (other) error('selection.itemIdClash', { id: item.nexoId, first: other, second: name });
    }
    for (const kind of MEDIA_KIND_LIST) {
      for (const entry of mediaList(project, kind)) {
        const id = mediaGlobalId(project, kind, entry);
        const other = firstOwner(mediaIds[kind], id, index);
        if (other) error(`selection.${kind}IdClash`, { id, first: other, second: name });
      }
    }
    for (const path of [...plan.itemFiles.keys(), ...plan.recipeFiles.keys(), ...plan.glyphFiles.keys()]) {
      const other = firstOwner(pluginFiles, path, index);
      const pair = `${pluginFiles.get(path)}:${index}`;
      if (other && !reportedFilePairs.has(pair)) {
        reportedFilePairs.add(pair);
        error('selection.pluginFileClash', { first: other, second: name, path, slug: projectFileName(project) });
      }
    }
    // Nexo merges all external packs – identical paths then overwrite each other
    for (const path of plan.packFiles.keys()) {
      if (!path.startsWith('assets/')) continue;
      const other = firstOwner(assetFiles, path, index);
      if (other && !reportedAssets.has(path)) {
        reportedAssets.add(path);
        report('warning', 'selection.assetFileClash', { first: other, second: name, path });
      }
    }
  });
  return issues;
}

/* ====================================================================== helpers for the selection UI */

/** Selects or deselects the given items. */
export function setItemsSelected(selection: ExportSelection, itemIds: string[], selected: boolean): ExportSelection {
  const excluded = new Set(selection.excludedItemIds);
  for (const id of itemIds) {
    if (selected) excluded.delete(id);
    else excluded.add(id);
  }
  return { ...selection, excludedItemIds: [...excluded] };
}

export type ListSelectionKey = (typeof MEDIA_KINDS)[MediaKind]['excludedKey'];

export function setListSelected(selection: ExportSelection, key: ListSelectionKey, ids: string[], selected: boolean): ExportSelection {
  const excluded = new Set(selection[key] ?? []);
  for (const id of ids) {
    if (selected) excluded.delete(id);
    else excluded.add(id);
  }
  return { ...selection, [key]: [...excluded] };
}

/** Selection state of multiple entries: all, none or some. */
export function selectionState(ids: string[], excluded: string[]): 'all' | 'none' | 'some' {
  if (ids.length === 0) return 'none';
  const set = new Set(excluded);
  const count = ids.filter((id) => !set.has(id)).length;
  return count === ids.length ? 'all' : count === 0 ? 'none' : 'some';
}
