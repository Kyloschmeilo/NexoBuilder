/**
 * Export selection: export only certain folders, items and glyphs of a project
 * and pack multiple projects together into one ZIP.
 *
 * For the selection, a sub-project with the same folders (just without the deselected
 * items) is created – paths and file names thus stay exactly as in the full export.
 */
import type { Project } from '../types';
import type { MessageParams } from '../errors';
import { slugify } from '../util';
import { planExport, type ExportPlan, type PlanOptions, type ProjectIssue } from './plan';

/** What is deselected gets stored – this way new items are included automatically. */
export interface ExportSelection {
  excludedItemIds: string[];
  excludedGlyphIds: string[];
  excludedSoundIds?: string[];
  excludedPaintingIds?: string[];
}

export const SELECT_ALL: ExportSelection = { excludedItemIds: [], excludedGlyphIds: [] };

export function isEverythingSelected(selection: ExportSelection | undefined): boolean {
  return (
    !selection ||
    (selection.excludedItemIds.length === 0 &&
      selection.excludedGlyphIds.length === 0 &&
      !selection.excludedSoundIds?.length &&
      !selection.excludedPaintingIds?.length)
  );
}

/** Number of selected items and glyphs. */
export function countSelected(
  project: Project,
  selection: ExportSelection | undefined,
): { items: number; glyphs: number; sounds: number; paintings: number } {
  const excludedItems = new Set(selection?.excludedItemIds ?? []);
  const excludedGlyphs = new Set(selection?.excludedGlyphIds ?? []);
  const excludedSounds = new Set(selection?.excludedSoundIds ?? []);
  const excludedPaintings = new Set(selection?.excludedPaintingIds ?? []);
  return {
    items: Object.keys(project.items).filter((id) => !excludedItems.has(id)).length,
    glyphs: (project.glyphs ?? []).filter((g) => !excludedGlyphs.has(g.id)).length,
    sounds: (project.sounds ?? []).filter((g) => !excludedSounds.has(g.id)).length,
    paintings: (project.paintings ?? []).filter((g) => !excludedPaintings.has(g.id)).length,
  };
}

/**
 * Sub-project with the selected items and glyphs. Folders without selected items
 * are dropped, all others keep their name and order.
 */
export function selectFromProject(project: Project, selection: ExportSelection | undefined): Project {
  if (isEverythingSelected(selection)) return project;
  const excludedItems = new Set(selection!.excludedItemIds);
  const excludedGlyphs = new Set(selection!.excludedGlyphIds);
  const excludedSounds = new Set(selection!.excludedSoundIds ?? []);
  const excludedPaintings = new Set(selection!.excludedPaintingIds ?? []);

  const items: Project['items'] = {};
  for (const [id, item] of Object.entries(project.items)) {
    if (!excludedItems.has(id)) items[id] = item;
  }

  // Keep folders in which something (also further down) is still selected
  const keep = new Map<string, boolean>();
  const visit = (id: string, guard: Set<string>): boolean => {
    if (keep.has(id)) return keep.get(id)!;
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
    glyphs: (project.glyphs ?? []).filter((g) => !excludedGlyphs.has(g.id)),
    sounds: (project.sounds ?? []).filter((g) => !excludedSounds.has(g.id)),
    paintings: (project.paintings ?? []).filter((g) => !excludedPaintings.has(g.id)),
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
  /** All messages; with multiple projects prefixed with the project name */
  issues: ProjectIssue[];
}

/**
 * Plans the combined export. With multiple projects, the items of each project end up in
 * items/<project>/ so that folders with the same name do not overwrite each other. Overlaps
 * between the projects (item IDs, pack names, files) are reported as errors.
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

  const issues: ProjectIssue[] = [];
  for (const { project, plan } of projects) {
    for (const issue of plan.issues) {
      // From the export dialog only items of the open project can be opened – the IDs are kept anyway
      const { level, itemId, folderId, glyphId, soundId, paintingId } = issue;
      issues.push({
        level,
        code: 'context.project',
        params: { project: project.name },
        detail: issue,
        ...(itemId && { itemId }),
        ...(folderId && { folderId }),
        ...(glyphId && { glyphId }),
        ...(soundId && { soundId }),
        ...(paintingId && { paintingId }),
        projectId: project.id,
      });
    }
  }
  issues.push(...crossProjectIssues(projects));
  return { projects, issues };
}

function crossProjectIssues(projects: PlannedProject[]): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const error = (code: string, params: MessageParams) => issues.push({ level: 'error', code, params });

  // Remembers the first project (index) per key and returns its name on overlap
  const firstOwner = <K>(map: Map<K, number>, key: K, owner: number): string | null => {
    const other = map.get(key);
    if (other === undefined) map.set(key, owner);
    return other !== undefined && other !== owner ? projects[other].project.name : null;
  };

  const packNames = new Map<string, number>();
  const nexoIds = new Map<string, number>();
  const glyphIds = new Map<string, number>();
  const soundIds = new Map<string, number>();
  const paintingIds = new Map<string, number>();
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
    for (const glyph of project.glyphs ?? []) {
      const other = firstOwner(glyphIds, glyph.glyphId, index);
      if (other) error('selection.glyphIdClash', { id: glyph.glyphId, first: other, second: name });
    }
    for (const entry of plan.soundEntries) {
      const id = String(entry.id);
      const other = firstOwner(soundIds, id, index);
      if (other) error('selection.soundIdClash', { id, first: other, second: name });
    }
    for (const id of Object.keys(plan.paintingEntries)) {
      const other = firstOwner(paintingIds, id, index);
      if (other) error('selection.paintingIdClash', { id, first: other, second: name });
    }
    for (const path of [...plan.itemFiles.keys(), ...plan.recipeFiles.keys(), ...plan.glyphFiles.keys()]) {
      const other = firstOwner(pluginFiles, path, index);
      const pair = `${pluginFiles.get(path)}:${index}`;
      if (other && !reportedFilePairs.has(pair)) {
        reportedFilePairs.add(pair);
        error('selection.pluginFileClash', { first: other, second: name, path, slug: slugify(name, 'resourcepackbuilder') });
      }
    }
    // Nexo merges all external packs – identical paths then overwrite each other
    for (const path of plan.packFiles.keys()) {
      if (!path.startsWith('assets/')) continue;
      const other = firstOwner(assetFiles, path, index);
      if (other && !reportedAssets.has(path)) {
        reportedAssets.add(path);
        issues.push({ level: 'warning', code: 'selection.assetFileClash', params: { first: other, second: name, path } });
      }
    }
  });
  return issues;
}

/* ====================================================================== helpers for the selection UI */

/** All items in a folder and its subfolders. */
export function itemIdsInFolder(project: Project, folderId: string): string[] {
  const result: string[] = [];
  const guard = new Set<string>();
  const visit = (id: string) => {
    const folder = project.folders[id];
    if (!folder || guard.has(id)) return;
    guard.add(id);
    result.push(...folder.itemIds.filter((itemId) => project.items[itemId]));
    folder.folderIds.forEach(visit);
  };
  visit(folderId);
  return result;
}

/** Selects or deselects the given items. */
export function setItemsSelected(selection: ExportSelection, itemIds: string[], selected: boolean): ExportSelection {
  const excluded = new Set(selection.excludedItemIds);
  for (const id of itemIds) {
    if (selected) excluded.delete(id);
    else excluded.add(id);
  }
  return { ...selection, excludedItemIds: [...excluded] };
}

export type ListSelectionKey = 'excludedGlyphIds' | 'excludedSoundIds' | 'excludedPaintingIds';

export function setListSelected(selection: ExportSelection, key: ListSelectionKey, ids: string[], selected: boolean): ExportSelection {
  const excluded = new Set(selection[key] ?? []);
  for (const id of ids) {
    if (selected) excluded.delete(id);
    else excluded.add(id);
  }
  return { ...selection, [key]: [...excluded] };
}

export function setGlyphsSelected(selection: ExportSelection, glyphIds: string[], selected: boolean): ExportSelection {
  const excluded = new Set(selection.excludedGlyphIds);
  for (const id of glyphIds) {
    if (selected) excluded.delete(id);
    else excluded.add(id);
  }
  return { ...selection, excludedGlyphIds: [...excluded] };
}

/** Selection state of multiple entries: all, none or some. */
export function selectionState(ids: string[], excluded: string[]): 'all' | 'none' | 'some' {
  if (ids.length === 0) return 'none';
  const set = new Set(excluded);
  const count = ids.filter((id) => !set.has(id)).length;
  return count === ids.length ? 'all' : count === 0 ? 'none' : 'some';
}
