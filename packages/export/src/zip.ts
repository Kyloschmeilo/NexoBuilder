/**
 * The export archive (one or more projects). One list of entries drives both the ZIP and the
 * path preview, so they cannot drift apart.
 */
import JSZip from 'jszip';
import type { Project } from '@resourcepackbuilder/core/project';
import { exportPackName, isSafeRelativePath } from './paths';
import type { MultiExportPlan } from './selection';
import { buildRootFiles, packTargetFor, type PackTarget } from './targets';
import type { ExportMode, FileContent } from './types';

/** The install guide in the archive of a full export */
export const INSTALL_GUIDE_FILE = 'INSTALL.txt';

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

/** Adds an entry; a path that could reach outside the archive (planning reports and drops those) is refused. */
function setEntry(entries: Map<string, ArchiveEntry>, path: string, entry: ArchiveEntry): void {
  if (!isSafeRelativePath(path)) throw new Error(`Unsafe path in the export archive: ${path}`);
  entries.set(path, entry);
}

function addAll(entries: Map<string, ArchiveEntry>, files: Map<string, FileContent>, prefix = ''): void {
  for (const [path, content] of files) setEntry(entries, prefix + path, { content });
}

/** How the resource pack goes into the plugin folder: as the project setting says, always as a folder, or not at all. */
type PackPlacement = 'setting' | 'folder' | 'none';

/** The pack targets of the archive's projects, in the order they first appear. */
function archiveTargets(multi: MultiExportPlan): PackTarget[] {
  return [...new Set(multi.projects.map((e) => packTargetFor(e.project)))];
}

/** Whether the archive holds several plugin folders (projects of different targets) and is extracted into the server folder. */
function isPrefixed(multi: MultiExportPlan): boolean {
  return archiveTargets(multi).length > 1;
}

/**
 * Where a project's plugin files go in the archive. When all projects share a plugin folder, the
 * archive is extracted into it (no prefix); projects of different targets each get their plugin folder.
 */
function pluginPrefix(multi: MultiExportPlan, project: Project): string {
  return isPrefixed(multi) ? `${packTargetFor(project).layout.pluginDir}/` : '';
}

/** The files of the plugin folders (item configs, recipes, glyphs, the pack and Nexo's sounds.yml/paintings.yml), by path. */
function pluginEntries(multi: MultiExportPlan, pack: PackPlacement): Map<string, ArchiveEntry> {
  const entries = new Map<string, ArchiveEntry>();
  for (const { project, plan } of multi.projects) {
    const { layout } = packTargetFor(project);
    const prefix = pluginPrefix(multi, project);
    addAll(entries, plan.pluginFiles, prefix);
    if (pack === 'setting' && layout.packAsZip(project))
      setEntry(entries, prefix + layout.packLocation(project, true), { zip: plan.packFiles });
    else if (pack !== 'none') addAll(entries, plan.packFiles, prefix + layout.packLocation(project, false));
  }
  // Only Nexo plans carry root file entries; the files lie in the Nexo plugin folder
  const nexo = multi.projects.find((e) => e.plan.nexo);
  if (nexo) addAll(entries, buildRootFiles(multi.projects.map((e) => e.plan)), pluginPrefix(multi, nexo.project));
  return entries;
}

/**
 * Everything the projects put into their plugin folders, by path – the archive of a full export and
 * the test server use the same list. `packAsFolder` ignores the "pack as ZIP" setting.
 */
export function pluginFolderEntries(multi: MultiExportPlan, options: { packAsFolder?: boolean } = {}): Map<string, ArchiveEntry> {
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
  const entries = pluginFolderEntries(multi);
  if (multi.projects.length > 0) entries.set(INSTALL_GUIDE_FILE, { content: installGuide(multi) });
  return entries;
}

/** The install guide: the target's own, or for projects of several targets an intro and one part per target. */
function installGuide(multi: MultiExportPlan): string {
  const rootFiles = buildRootFiles(multi.projects.map((e) => e.plan));
  const targets = archiveTargets(multi);
  if (targets.length === 1) return targets[0].layout.installGuide(multi, rootFiles, { prefixed: false });
  const parts = targets.map((target) => {
    const projects = multi.projects.filter((e) => packTargetFor(e.project) === target);
    return target.layout.installGuide({ ...multi, projects }, rootFiles, { prefixed: true });
  });
  const intro = [
    `ResourcepackBuilder – ${multi.projects.length} projects for ${targets.length} server plugins`,
    '==========================================',
    '',
    'Extract this ZIP archive into the folder of your server (the one that holds the folder "plugins").',
    `It holds one folder per plugin (${targets.map((t) => `${t.layout.pluginDir}/`).join(', ')}); follow the part of each plugin below.`,
    '',
  ].join('\n');
  return [intro, ...parts].join('\n\n');
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
  const targets = archiveTargets(multi);
  return `${base}_${targets.length === 1 ? targets[0].layout.fileTag : 'plugins'}.zip`;
}
