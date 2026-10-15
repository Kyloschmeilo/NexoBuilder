/**
 * The export archive (one or more projects). One list of entries drives both the ZIP and the
 * path preview, so they cannot drift apart.
 */
import JSZip from 'jszip';
import type { Project } from '../project/types';
import { INSTALL_GUIDE_FILE, installGuide } from './installGuide';
import { exportPackName, packLocation } from './paths';
import { buildRootFiles } from './rootFiles';
import type { MultiExportPlan } from './selection';
import type { ExportMode, ExportPlan, FileContent } from './types';

export interface ExportResult {
  fileName: string;
  data: Uint8Array;
  /** All paths in the archive (for the preview) */
  paths: string[];
}

/** A file of the archive; `zip` = a nested archive built from these files. */
type ArchiveEntry = { content: FileContent } | { zip: Map<string, FileContent> };

/** Fixed timestamps ensure that the same content yields the same ZIP. */
const FIXED_DATE = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));

function single(project: Project, plan: ExportPlan): MultiExportPlan {
  return { projects: [{ project, plan }], issues: plan.issues };
}

/** Everything that ends up in the archive, by path. */
function archiveEntries(multi: MultiExportPlan, mode: ExportMode): Map<string, ArchiveEntry> {
  const entries = new Map<string, ArchiveEntry>();
  const addAll = (files: Map<string, FileContent>, prefix = '') => {
    for (const [path, content] of files) entries.set(prefix + path, { content });
  };
  for (const { project, plan } of multi.projects) {
    if (mode === 'pack') {
      addAll(plan.packFiles, packPrefix(multi, project));
      continue;
    }
    for (const files of [plan.itemFiles, plan.recipeFiles, plan.glyphFiles]) addAll(files);
    if (mode === 'full') {
      if (project.settings.externalPackAsZip) entries.set(packLocation(project), { zip: plan.packFiles });
      else addAll(plan.packFiles, packLocation(project));
    }
  }
  if (mode === 'pack') return entries;
  const rootFiles = buildRootFiles(multi.projects.map((e) => e.plan));
  addAll(rootFiles);
  if (mode === 'full' && multi.projects.length > 0) entries.set(INSTALL_GUIDE_FILE, { content: installGuide(multi, rootFiles) });
  return entries;
}

/** A single pack lies directly in the ZIP, multiple packs each get a folder. */
function packPrefix(multi: MultiExportPlan, project: Project): string {
  return multi.projects.length === 1 ? '' : `${exportPackName(project)}/`;
}

/** Lists the paths that end up in the archive (without creating it). */
export function listExportPaths(project: Project, plan: ExportPlan, mode: ExportMode): string[] {
  return listMultiExportPaths(single(project, plan), mode);
}

export function listMultiExportPaths(multi: MultiExportPlan, mode: ExportMode): string[] {
  return [...archiveEntries(multi, mode).keys()].sort();
}

export async function buildExportZip(project: Project, plan: ExportPlan, mode: ExportMode): Promise<ExportResult> {
  return buildMultiExportZip(single(project, plan), mode);
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
  const base = multi.projects.length === 1 ? exportPackName(multi.projects[0].project) : `resourcepackbuilder_${multi.projects.length}_projects`;
  if (mode === 'pack') return multi.projects.length === 1 ? `${base}.zip` : `${base}_packs.zip`;
  if (mode === 'items') return `${base}_items.zip`;
  return `${base}_nexo.zip`;
}

