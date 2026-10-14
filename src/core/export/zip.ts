/** Erstellt das ZIP-Archiv für den Export (ein oder mehrere Projekte). */
import JSZip from 'jszip';
import type { Project } from '../types';
import type { ExportMode, ExportPlan, FileContent } from './plan';
import type { MultiExportPlan, PlannedProject } from './selection';

export interface ExportResult {
  fileName: string;
  data: Uint8Array;
  /** Alle Pfade im Archiv (für die Vorschau) */
  paths: string[];
}

/** Feste Zeitstempel sorgen dafür, dass derselbe Inhalt dasselbe ZIP ergibt. */
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
  const base = project.settings.packName || 'nexobuilder';
  if (mode === 'pack') return `${base}.zip`;
  if (mode === 'items') return `${base}_items.zip`;
  return `${base}_nexo.zip`;
}

export function multiExportFileName(multi: MultiExportPlan, mode: ExportMode): string {
  if (multi.projects.length === 1) return exportFileName(multi.projects[0].project, mode);
  const base = `nexobuilder_${multi.projects.length}_projekte`;
  if (mode === 'pack') return `${base}_packs.zip`;
  if (mode === 'items') return `${base}_items.zip`;
  return `${base}_nexo.zip`;
}

function packLocation(project: Project): string {
  const packName = project.settings.packName;
  return project.settings.externalPackAsZip ? `pack/external_packs/${packName}.zip` : `pack/external_packs/${packName}/`;
}

/** Ein einzelnes Pack liegt direkt im ZIP, mehrere bekommen je einen Ordner. */
function packPrefix(multi: MultiExportPlan, entry: PlannedProject): string {
  return multi.projects.length === 1 ? '' : `${entry.project.settings.packName}/`;
}

/** Listet die Pfade, die im Archiv landen (ohne es zu erzeugen). */
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
  if (mode === 'full' && multi.projects.length > 0) paths.add('ANLEITUNG.txt');
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
  if (mode === 'full' && multi.projects.length > 0) {
    const guide =
      multi.projects.length === 1 ? installGuide(multi.projects[0].project, multi.projects[0].plan) : multiInstallGuide(multi);
    zip.file('ANLEITUNG.txt', guide, { date: FIXED_DATE });
  }

  const data = await generate(zip);
  return { fileName: multiExportFileName(multi, mode), data, paths: listMultiExportPaths(multi, mode) };
}

const USAGE = [
  '2. Im Spiel oder in der Konsole ausführen:',
  '      /nexo reload all',
  '   (lädt Items, Rezepte und den Resourcepack neu – alternativ den Server neu starten)',
  '',
  '3. Items erhalten:',
  '      /nexo give <item_id> [anzahl] [spieler]   (z.B. /nexo give ruby_sword 1 Steve)',
  '   oder über das Nexo-Inventar:  /nexo inventory',
];

export function installGuide(project: Project, plan: ExportPlan): string {
  const location = packLocation(project);
  const ids = plan.items.map((p) => `  - ${p.item.nexoId}`).join('\n');
  return [
    `NexoBuilder – Projekt "${project.name}"`,
    '==========================================',
    '',
    'Installation',
    '------------',
    '1. Den Inhalt dieses ZIP-Archivs in den Ordner  plugins/Nexo/  deines Servers entpacken.',
    '   Die Ordner "items" und "pack" werden dabei mit den vorhandenen Ordnern zusammengeführt.',
    '',
    '   items/...                 -> die Item-Konfigurationen',
    ...(plan.recipeFiles.size > 0 ? ['   recipes/...               -> die Crafting-Rezepte'] : []),
    ...(plan.glyphFiles.size > 0 ? ['   glyphs/...                -> die Glyphen (Nutzung: <glyph:id>)'] : []),
    `   ${location.padEnd(25)} -> der Resourcepack (wird von Nexo automatisch eingebunden)`,
    '',
    ...USAGE,
    '',
    `Namespace des Resourcepacks: ${project.namespace}`,
    `Ziel-Version: Minecraft ${project.settings.minecraftVersion}`,
    '',
    'Enthaltene Items',
    '----------------',
    ids || '  (keine)',
    '',
  ].join('\n');
}

export function multiInstallGuide(multi: MultiExportPlan): string {
  const lines = [
    `NexoBuilder – ${multi.projects.length} Projekte`,
    '==========================================',
    '',
    'Installation',
    '------------',
    '1. Den Inhalt dieses ZIP-Archivs in den Ordner  plugins/Nexo/  deines Servers entpacken.',
    '   Die Ordner "items" und "pack" werden dabei mit den vorhandenen Ordnern zusammengeführt.',
    '   Jedes Projekt hat einen eigenen Ordner unter items/ und einen eigenen Resourcepack:',
    '',
  ];
  for (const { project } of multi.projects) {
    lines.push(`   ${project.name}: ${packLocation(project)}`);
  }
  lines.push('', ...USAGE, '');
  for (const { project, plan } of multi.projects) {
    const title = `Projekt "${project.name}"`;
    lines.push(
      title,
      '-'.repeat(title.length),
      `Namespace: ${project.namespace} · Minecraft ${project.settings.minecraftVersion}`,
      ...(plan.items.length > 0 ? plan.items.map((p) => `  - ${p.item.nexoId}`) : ['  (keine Items)']),
      ...(project.glyphs.length > 0 ? [`  + ${project.glyphs.length} Glyph(en)`] : []),
      '',
    );
  }
  return lines.join('\n');
}
