/**
 * Files for the local test server: the project as it lies in plugins/Nexo/,
 * plus the Nexo settings so that the resource pack is served locally (localhost).
 */
import { Document, isMap, parseDocument } from 'yaml';
import { packLocation } from '../export/paths';
import { buildRootFiles } from '../export/rootFiles';
import type { ExportPlan, FileContent } from '../export/types';
import type { Project } from '../project/types';

export interface ServerFile {
  /** Path relative to plugins/Nexo */
  path: string;
  data: FileContent;
}

/** All project files for plugins/Nexo (resource pack always as a folder, which syncs faster). */
export function nexoFolderFiles(project: Project, plan: ExportPlan): ServerFile[] {
  const packFolder = packLocation(project, false);
  const files: ServerFile[] = [];
  for (const map of [plan.itemFiles, plan.recipeFiles, plan.glyphFiles]) {
    for (const [path, data] of map) files.push({ path, data });
  }
  for (const [path, data] of plan.packFiles) files.push({ path: packFolder + path, data });
  for (const [path, data] of buildRootFiles([plan])) files.push({ path, data });
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export interface NexoServerSettings {
  /** Port over which Nexo serves the resource pack */
  packPort: number;
}

/** Values that ResourcepackBuilder sets in plugins/Nexo/settings.yml */
function settingsOverrides(options: NexoServerSettings): Array<[string[], unknown]> {
  return [
    // Serve the pack directly from the local machine instead of via an upload service
    [['Pack', 'server', 'type'], 'SELFHOST'],
    [['Pack', 'server', 'selfhost', 'port'], options.packPort],
    [['Pack', 'server', 'selfhost', 'public_address'], '127.0.0.1'],
    // After /nexo reload, send the new pack to all players immediately
    [['Pack', 'dispatch', 'send_on_reload'], true],
    // Unnecessary for testing, slows down generation and uses a cache that can break
    [['Pack', 'obfuscation', 'type'], 'NONE'],
  ];
}

/**
 * Sets the required settings in settings.yml. Everything else (including comments) is preserved.
 * If the file does not exist yet, a small file is created – Nexo fills in the rest on startup.
 * If all values are already correct, the file is returned unchanged (Nexo reformats it itself –
 * that must not count as a change, otherwise Nexo would be reloaded constantly).
 */
export function patchNexoSettings(current: string | null, options: NexoServerSettings): string {
  const doc = current?.trim() ? parseDocument(current, { version: '1.1' }) : new Document({}, { version: '1.1' });
  if (doc.errors.length > 0 || (doc.contents !== null && typeof doc.toJS() !== 'object')) {
    // Don't make a broken file worse: only write our values fresh
    return patchNexoSettings(null, options);
  }
  if (!current?.trim()) doc.commentBefore = ' Created by ResourcepackBuilder – Nexo adds the remaining settings on startup.';
  let changed = !current?.trim();
  for (const [path, value] of settingsOverrides(options)) {
    if (sameSetting(doc.getIn(path), value)) continue;
    changed = true;
    // Create missing or wrong intermediate levels as normal sections
    for (let i = 1; i < path.length; i++) {
      const prefix = path.slice(0, i);
      if (!isMap(doc.getIn(prefix, true))) doc.setIn(prefix, doc.createNode({}));
    }
    doc.setIn(path, value);
  }
  if (!changed && current !== null) return current;
  return doc.toString({ lineWidth: 0 });
}

/** Nexo sometimes writes values differently (e.g. number as text, enum lowercase) – same content counts as equal. */
function sameSetting(actual: unknown, wanted: unknown): boolean {
  if (actual === wanted) return true;
  if (typeof wanted === 'number') return Number(actual) === wanted;
  if (typeof wanted === 'string' && typeof actual === 'string') return actual.trim().toUpperCase() === wanted.toUpperCase();
  if (typeof wanted === 'boolean') return String(actual).toLowerCase() === String(wanted);
  return false;
}

/** Nexo 1.29: "nexo give <item> <amount> <player>" (as registered in the plugin – not as in the help text) */
export function nexoGiveCommand(nexoId: string, amount: number, player: string): string {
  return `nexo give ${nexoId} ${Math.max(1, Math.floor(amount))} ${player}`;
}
