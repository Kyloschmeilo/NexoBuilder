/** Creates the ZIP archive for the export (one or more projects). */
import JSZip from 'jszip';
import type { Project } from '../types';
import type { ExportMode, ExportPlan, FileContent } from './plan';
import type { MultiExportPlan, PlannedProject } from './selection';
import { buildRootFiles, PAINTINGS_FILE, SOUNDS_FILE } from './rootFiles';

/** Installation guide put into a full export (English – the exported pack is not localised) */
export const INSTALL_GUIDE_FILE = 'INSTALL.txt';

export interface ExportResult {
  fileName: string;
  data: Uint8Array;
  /** All paths in the archive (for the preview) */
  paths: string[];
}

/** Fixed timestamps ensure that the same content yields the same ZIP. */
const FIXED_DATE = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));

function addFiles(zip: JSZip, files: Map<string, FileContent>, prefix = '') {
  const sorted = [...files.keys()].sort();
  for (const path of sorted) {
    zip.file(prefix + path, files.get(path)!, { date: FIXED_DATE, createFolders: false });
  }
}

async function generate(zip: JSZip): Promise<Uint8Array> {
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 9 }, platform: 'UNIX' });
}

function single(project: Project, plan: ExportPlan): MultiExportPlan {
  return { projects: [{ project, plan }], issues: plan.issues };
}

export function exportFileName(project: Project, mode: ExportMode): string {
  const base = project.settings.packName || 'resourcepackbuilder';
  if (mode === 'pack') return `${base}.zip`;
  if (mode === 'items') return `${base}_items.zip`;
  return `${base}_nexo.zip`;
}

export function multiExportFileName(multi: MultiExportPlan, mode: ExportMode): string {
  if (multi.projects.length === 1) return exportFileName(multi.projects[0].project, mode);
  const base = `resourcepackbuilder_${multi.projects.length}_projekte`;
  if (mode === 'pack') return `${base}_packs.zip`;
  if (mode === 'items') return `${base}_items.zip`;
  return `${base}_nexo.zip`;
}

function packLocation(project: Project): string {
  const packName = project.settings.packName;
  return project.settings.externalPackAsZip ? `pack/external_packs/${packName}.zip` : `pack/external_packs/${packName}/`;
}

/** A single pack lies directly in the ZIP, multiple packs each get a folder. */
function packPrefix(multi: MultiExportPlan, entry: PlannedProject): string {
  return multi.projects.length === 1 ? '' : `${entry.project.settings.packName}/`;
}

/** Lists the paths that end up in the archive (without creating it). */
export function listExportPaths(project: Project, plan: ExportPlan, mode: ExportMode): string[] {
  return listMultiExportPaths(single(project, plan), mode);
}

export function listMultiExportPaths(multi: MultiExportPlan, mode: ExportMode): string[] {
  const paths = new Set<string>();
  for (const entry of multi.projects) {
    const { project, plan } = entry;
    if (mode === 'pack') {
      for (const p of plan.packFiles.keys()) paths.add(packPrefix(multi, entry) + p);
      continue;
    }
    for (const p of [...plan.itemFiles.keys(), ...plan.recipeFiles.keys(), ...plan.glyphFiles.keys()]) paths.add(p);
    if (mode === 'full') {
      if (project.settings.externalPackAsZip) paths.add(`pack/external_packs/${project.settings.packName}.zip`);
      else for (const p of plan.packFiles.keys()) paths.add(`pack/external_packs/${project.settings.packName}/${p}`);
    }
  }
  if (mode !== 'pack') for (const p of buildRootFiles(multi.projects.map((e) => e.plan)).keys()) paths.add(p);
  if (mode === 'full' && multi.projects.length > 0) paths.add(INSTALL_GUIDE_FILE);
  return [...paths].sort();
}

export async function buildExportZip(project: Project, plan: ExportPlan, mode: ExportMode): Promise<ExportResult> {
  return buildMultiExportZip(single(project, plan), mode);
}

export async function buildMultiExportZip(multi: MultiExportPlan, mode: ExportMode): Promise<ExportResult> {
  const zip = new JSZip();
  for (const entry of multi.projects) {
    const { project, plan } = entry;
    if (mode === 'pack') {
      addFiles(zip, plan.packFiles, packPrefix(multi, entry));
      continue;
    }
    addFiles(zip, new Map([...plan.itemFiles, ...plan.recipeFiles, ...plan.glyphFiles]));
    if (mode === 'full') {
      const packName = project.settings.packName;
      if (project.settings.externalPackAsZip) {
        const inner = new JSZip();
        addFiles(inner, plan.packFiles);
        zip.file(`pack/external_packs/${packName}.zip`, await generate(inner), { date: FIXED_DATE });
      } else {
        addFiles(zip, plan.packFiles, `pack/external_packs/${packName}/`);
      }
    }
  }
  if (mode !== 'pack') addFiles(zip, buildRootFiles(multi.projects.map((e) => e.plan)));
  if (mode === 'full' && multi.projects.length > 0) {
    const guide =
      multi.projects.length === 1 ? installGuide(multi.projects[0].project, multi.projects[0].plan) : multiInstallGuide(multi);
    zip.file(INSTALL_GUIDE_FILE, guide, { date: FIXED_DATE });
  }

  const data = await generate(zip);
  return { fileName: multiExportFileName(multi, mode), data, paths: listMultiExportPaths(multi, mode) };
}

/** Note about sounds.yml/paintings.yml – there is only one file of each on the server */
function rootFileLines(plans: ExportPlan[]): string[] {
  const lines: string[] = [];
  const files = buildRootFiles(plans);
  if (files.has(SOUNDS_FILE)) lines.push('   sounds.yml                -> the sounds (the OGG files are in the resource pack)');
  if (files.has(PAINTINGS_FILE)) lines.push('   paintings.yml             -> the paintings (restart the server afterwards)');
  if (lines.length > 0) {
    lines.push('   WARNING: sounds.yml/paintings.yml replace existing files – back up your own entries first and copy them over.');
  }
  return lines;
}

const USAGE = [
  '2. Run in game or in the console:',
  '      /nexo reload all',
  '   (reloads items, recipes and the resource pack – or restart the server)',
  '',
  '3. Get the items:',
  '      /nexo give <item_id> [amount] [player]   (e.g. /nexo give ruby_sword 1 Steve)',
  '   or via the Nexo inventory:  /nexo inventory',
];

export function installGuide(project: Project, plan: ExportPlan): string {
  const location = packLocation(project);
  const ids = plan.items.map((p) => `  - ${p.item.nexoId}`).join('\n');
  return [
    `ResourcepackBuilder – project "${project.name}"`,
    '==========================================',
    '',
    'Installation',
    '------------',
    '1. Extract the contents of this ZIP archive into the folder  plugins/Nexo/  of your server.',
    '   The folders "items" and "pack" are merged with the existing folders.',
    '',
    '   items/...                 -> the item configurations',
    ...(plan.recipeFiles.size > 0 ? ['   recipes/...               -> the crafting recipes'] : []),
    ...(plan.glyphFiles.size > 0 ? ['   glyphs/...                -> the glyphs (usage: <glyph:id>)'] : []),
    ...rootFileLines([plan]),
    `   ${location.padEnd(25)} -> the resource pack (Nexo includes it automatically)`,
    '',
    ...USAGE,
    '',
    `Resource pack namespace: ${project.namespace}`,
    `Target version: Minecraft ${project.settings.minecraftVersion}`,
    '',
    'Included items',
    '--------------',
    ids || '  (none)',
    '',
  ].join('\n');
}

export function multiInstallGuide(multi: MultiExportPlan): string {
  const lines = [
    `ResourcepackBuilder – ${multi.projects.length} projects`,
    '==========================================',
    '',
    'Installation',
    '------------',
    '1. Extract the contents of this ZIP archive into the folder  plugins/Nexo/  of your server.',
    '   The folders "items" and "pack" are merged with the existing folders.',
    '   Each project has its own folder under items/ and its own resource pack:',
    '',
  ];
  const extra = rootFileLines(multi.projects.map((p) => p.plan));
  for (const { project } of multi.projects) {
    lines.push(`   ${project.name}: ${packLocation(project)}`);
  }
  if (extra.length > 0) lines.push('', ...extra);
  lines.push('', ...USAGE, '');
  for (const { project, plan } of multi.projects) {
    const title = `Project "${project.name}"`;
    lines.push(
      title,
      '-'.repeat(title.length),
      `Namespace: ${project.namespace} · Minecraft ${project.settings.minecraftVersion}`,
      ...(plan.items.length > 0 ? plan.items.map((p) => `  - ${p.item.nexoId}`) : ['  (no items)']),
      ...(project.glyphs.length > 0 ? [`  + ${project.glyphs.length} glyph(s)`] : []),
      '',
    );
  }
  return lines.join('\n');
}
