/**
 * The export archive (one or more projects). One list of entries drives both the ZIP and the
 * path preview, so they cannot drift apart.
 */
import JSZip from 'jszip';
import type { Project } from '@resourcepackbuilder/core/project';
import { INSTALL_GUIDE_FILE, installGuide } from './installGuide';
import { exportPackName, packLocation } from './paths';
import { buildRootFiles } from './rootFiles';
import type { MultiExportPlan } from './selection';
import type { ExportMode, FileContent } from './types';

export interface ExportResult {
  fileName: string;
  data: Uint8Array;
  /** All paths in the archive (for the preview) */
  paths: string[];
}

/** A file of the archive; `zip` = a nested archive built from these files. */
export type ArchiveEntry = { content: FileContent } | { zip: Map<string, FileContent> };

/** Fixed timestamps ensure that the same content yields the same ZIP. */
const FIXED_DATE = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));

function addAll(entries: Map<string, ArchiveEntry>, files: Map<string, FileContent>, prefix = ''): void {
  for (const [path, content] of files) entries.set(prefix + path, { content });
}

/** How the resource pack goes into plugins/Nexo: as the project setting says, always as a folder, or not at all. */
type PackPlacement = 'setting' | 'folder' | 'none';

/** The files of plugins/Nexo (items, recipes, glyphs, the pack and sounds.yml/paintings.yml), by path. */
function pluginEntries(multi: MultiExportPlan, pack: PackPlacement): Map<string, ArchiveEntry> {
  const entries = new Map<string, ArchiveEntry>();
  for (const { project, plan } of multi.projects) {
    for (const files of [plan.itemFiles, plan.recipeFiles, plan.glyphFiles]) addAll(entries, files);
    if (pack === 'setting' && project.settings.externalPackAsZip) entries.set(packLocation(project, true), { zip: plan.packFiles });
    else if (pack !== 'none') addAll(entries, plan.packFiles, packLocation(project, false));
  }
  addAll(entries, buildRootFiles(multi.projects.map((e) => e.plan)));
  return entries;
}

/**
 * Everything the projects put into plugins/Nexo, by path – the archive of a full export and the
 * test server use the same list. `packAsFolder` ignores the "pack as ZIP" setting.
 */
export function nexoFolderEntries(multi: MultiExportPlan, options: { packAsFolder?: boolean } = {}): Map<string, ArchiveEntry> {
  return pluginEntries(multi, options.packAsFolder ? 'folder' : 'setting');
}

/** Everything that ends up in the archive, by path. */
function archiveEntries(multi: MultiExportPlan, mode: ExportMode): Map<string, ArchiveEntry> {
  if (mode === 'pack') {
    const entries = new Map<string, ArchiveEntry>();
    for (const { project, plan } of multi.projects) addAll(entries, plan.packFiles, packPrefix(multi, project));
    return entries;
  }
  if (mode === 'items') return pluginEntries(multi, 'none');
  const entries = nexoFolderEntries(multi);
  if (multi.projects.length > 0) {
    const rootFiles = buildRootFiles(multi.projects.map((e) => e.plan));
    entries.set(INSTALL_GUIDE_FILE, { content: installGuide(multi, rootFiles) });
  }
  return entries;
}

/** A single pack lies directly in the ZIP, multiple packs each get a folder. */
function packPrefix(multi: MultiExportPlan, project: Project): string {
  return multi.projects.length === 1 ? '' : `${exportPackName(project)}/`;
}

/** Lists the paths that end up in the archive (without creating it). */
export function listMultiExportPaths(multi: MultiExportPlan, mode: ExportMode): string[] {
  return [...archiveEntries(multi, mode).keys()].sort();
}

export async function buildMultiExportZip(multi: MultiExportPlan, mode: ExportMode): Promise<ExportResult> {
  const entries = archiveEntries(multi, mode);
  const zip = new JSZip();
  const paths = [...entries.keys()].sort();
  for (const path of paths) {
    const entry = entries.get(path);
    if (!entry) continue;
    const content = 'zip' in entry ? await zipFiles(entry.zip) : entry.content;
    zip.file(path, content, { date: FIXED_DATE, createFolders: false });
  }
  return { fileName: exportFileName(multi, mode), data: await generate(zip), paths };
}

async function zipFiles(files: Map<string, FileContent>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const path of [...files.keys()].sort()) {
    const content = files.get(path);
    if (content !== undefined) zip.file(path, content, { date: FIXED_DATE, createFolders: false });
  }
  return generate(zip);
}

function generate(zip: JSZip): Promise<Uint8Array> {
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 9 }, platform: 'UNIX' });
}

function exportFileName(multi: MultiExportPlan, mode: ExportMode): string {
  const base =
    multi.projects.length === 1 ? exportPackName(multi.projects[0].project) : `resourcepackbuilder_${multi.projects.length}_projects`;
  if (mode === 'pack') return multi.projects.length === 1 ? `${base}.zip` : `${base}_packs.zip`;
  if (mode === 'items') return `${base}_items.zip`;
  return `${base}_nexo.zip`;
}
