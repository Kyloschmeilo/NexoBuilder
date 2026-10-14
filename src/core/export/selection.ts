/**
 * Export-Auswahl: nur bestimmte Ordner, Items und Glyphen eines Projekts exportieren
 * und mehrere Projekte gemeinsam in ein ZIP packen.
 *
 * Für die Auswahl entsteht ein Teilprojekt mit denselben Ordnern (nur ohne die abgewählten
 * Items) – Pfade und Dateinamen bleiben dadurch genau wie beim vollständigen Export.
 */
import type { Project } from '../types';
import { slugify } from '../util';
import { planExport, type ExportPlan, type PlanOptions, type ProjectIssue } from './plan';

/** Gespeichert wird, was abgewählt ist – neue Items sind so automatisch dabei. */
export interface ExportSelection {
  excludedItemIds: string[];
  excludedGlyphIds: string[];
}

export const SELECT_ALL: ExportSelection = { excludedItemIds: [], excludedGlyphIds: [] };

export function isEverythingSelected(selection: ExportSelection | undefined): boolean {
  return !selection || (selection.excludedItemIds.length === 0 && selection.excludedGlyphIds.length === 0);
}

/** Anzahl der ausgewählten Items und Glyphen. */
export function countSelected(project: Project, selection: ExportSelection | undefined): { items: number; glyphs: number } {
  const excludedItems = new Set(selection?.excludedItemIds ?? []);
  const excludedGlyphs = new Set(selection?.excludedGlyphIds ?? []);
  return {
    items: Object.keys(project.items).filter((id) => !excludedItems.has(id)).length,
    glyphs: (project.glyphs ?? []).filter((g) => !excludedGlyphs.has(g.id)).length,
  };
}

/**
 * Teilprojekt mit den ausgewählten Items und Glyphen. Ordner ohne ausgewählte Items
 * fallen weg, alle anderen behalten Namen und Reihenfolge.
 */
export function selectFromProject(project: Project, selection: ExportSelection | undefined): Project {
  if (isEverythingSelected(selection)) return project;
  const excludedItems = new Set(selection!.excludedItemIds);
  const excludedGlyphs = new Set(selection!.excludedGlyphIds);

  const items: Project['items'] = {};
  for (const [id, item] of Object.entries(project.items)) {
    if (!excludedItems.has(id)) items[id] = item;
  }

  // Ordner behalten, in denen (auch weiter unten) noch etwas ausgewählt ist
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
  };
}

/* ====================================================================== mehrere Projekte */

export interface ExportEntry {
  project: Project;
  selection?: ExportSelection;
}

export interface PlannedProject {
  /** Teilprojekt (nur die Auswahl, ggf. mit angepassten Einstellungen) */
  project: Project;
  plan: ExportPlan;
}

export interface MultiExportPlan {
  projects: PlannedProject[];
  /** Alle Meldungen; bei mehreren Projekten mit dem Projektnamen davor */
  issues: ProjectIssue[];
}

/**
 * Plant den gemeinsamen Export. Bei mehreren Projekten landen die Items jedes Projekts in
 * items/<projekt>/, damit sich gleich benannte Ordner nicht überschreiben. Überschneidungen
 * zwischen den Projekten (Item-IDs, Pack-Namen, Dateien) werden als Fehler gemeldet.
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
      // Aus dem Export-Dialog lassen sich nur Items des geöffneten Projekts öffnen – die IDs bleiben trotzdem dran
      issues.push({ ...issue, message: `[${project.name}] ${issue.message}`, projectId: project.id });
    }
  }
  issues.push(...crossProjectIssues(projects));
  return { projects, issues };
}

function crossProjectIssues(projects: PlannedProject[]): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });

  // Merkt sich je Schlüssel das erste Projekt (Index) und liefert bei Überschneidung dessen Namen
  const firstOwner = <K>(map: Map<K, number>, key: K, owner: number): string | null => {
    const other = map.get(key);
    if (other === undefined) map.set(key, owner);
    return other !== undefined && other !== owner ? projects[other].project.name : null;
  };

  const packNames = new Map<string, number>();
  const nexoIds = new Map<string, number>();
  const glyphIds = new Map<string, number>();
  const pluginFiles = new Map<string, number>();
  const assetFiles = new Map<string, number>();
  const reportedAssets = new Set<string>();
  const reportedFilePairs = new Set<string>();

  projects.forEach(({ project, plan }, index) => {
    const name = project.name;
    const pack = project.settings.packName;
    const otherPack = firstOwner(packNames, pack.toLowerCase(), index);
    if (otherPack) {
      error(`„${otherPack}“ und „${name}“ verwenden denselben Pack-Namen „${pack}“. Bitte in den Einstellungen eines Projekts umbenennen.`);
    }
    for (const { item } of plan.items) {
      const other = firstOwner(nexoIds, item.nexoId, index);
      if (other) error(`Die Item-ID „${item.nexoId}“ gibt es in „${other}“ und in „${name}“. Nexo-IDs müssen eindeutig sein.`);
    }
    for (const glyph of project.glyphs ?? []) {
      const other = firstOwner(glyphIds, glyph.glyphId, index);
      if (other) error(`Den Glyph „${glyph.glyphId}“ gibt es in „${other}“ und in „${name}“. Glyph-IDs müssen eindeutig sein.`);
    }
    for (const path of [...plan.itemFiles.keys(), ...plan.recipeFiles.keys(), ...plan.glyphFiles.keys()]) {
      const other = firstOwner(pluginFiles, path, index);
      const pair = `${pluginFiles.get(path)}:${index}`;
      if (other && !reportedFilePairs.has(pair)) {
        reportedFilePairs.add(pair);
        error(
          `„${other}“ und „${name}“ würden beide die Datei „${path}“ schreiben (gleicher Projektname „${slugify(name, 'nexobuilder')}“). Bitte ein Projekt umbenennen.`,
        );
      }
    }
    // Nexo legt alle external packs zusammen – gleiche Pfade überschreiben sich dann gegenseitig
    for (const path of plan.packFiles.keys()) {
      if (!path.startsWith('assets/')) continue;
      const other = firstOwner(assetFiles, path, index);
      if (other && !reportedAssets.has(path)) {
        reportedAssets.add(path);
        issues.push({
          level: 'warning',
          message: `„${other}“ und „${name}“ enthalten beide „${path}“ – im fertigen Pack gewinnt nur eine Datei. Ein eigener Namespace pro Projekt vermeidet das.`,
        });
      }
    }
  });
  return issues;
}

/* ====================================================================== Hilfen für die Auswahl-Oberfläche */

/** Alle Items in einem Ordner und seinen Unterordnern. */
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

/** Wählt die angegebenen Items an oder ab. */
export function setItemsSelected(selection: ExportSelection, itemIds: string[], selected: boolean): ExportSelection {
  const excluded = new Set(selection.excludedItemIds);
  for (const id of itemIds) {
    if (selected) excluded.delete(id);
    else excluded.add(id);
  }
  return { ...selection, excludedItemIds: [...excluded] };
}

export function setGlyphsSelected(selection: ExportSelection, glyphIds: string[], selected: boolean): ExportSelection {
  const excluded = new Set(selection.excludedGlyphIds);
  for (const id of glyphIds) {
    if (selected) excluded.delete(id);
    else excluded.add(id);
  }
  return { ...selection, excludedGlyphIds: [...excluded] };
}

/** Auswahlzustand mehrerer Einträge: alle, keiner oder ein Teil. */
export function selectionState(ids: string[], excluded: string[]): 'all' | 'none' | 'some' {
  if (ids.length === 0) return 'none';
  const set = new Set(excluded);
  const count = ids.filter((id) => !set.has(id)).length;
  return count === ids.length ? 'all' : count === 0 ? 'none' : 'some';
}
