/** Erstellt das ZIP-Archiv für den Export. */
import JSZip from 'jszip';
import type { Project } from '../types';
import type { ExportMode, ExportPlan, FileContent } from './plan';

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

export function exportFileName(project: Project, mode: ExportMode): string {
  const base = project.settings.packName || 'nexobuilder';
  if (mode === 'pack') return `${base}.zip`;
  if (mode === 'items') return `${base}_items.zip`;
  return `${base}_nexo.zip`;
}

/** Listet die Pfade, die im Archiv landen (ohne es zu erzeugen). */
export function listExportPaths(project: Project, plan: ExportPlan, mode: ExportMode): string[] {
  const packName = project.settings.packName;
  const paths: string[] = [];
  if (mode === 'pack') return [...plan.packFiles.keys()].sort();
  if (mode === 'full' || mode === 'items') paths.push(...plan.itemFiles.keys(), ...plan.recipeFiles.keys(), ...plan.glyphFiles.keys());
  if (mode === 'full') {
    if (project.settings.externalPackAsZip) {
      paths.push(`pack/external_packs/${packName}.zip`);
    } else {
      paths.push(...[...plan.packFiles.keys()].map((p) => `pack/external_packs/${packName}/${p}`));
    }
    paths.push('ANLEITUNG.txt');
  }
  return paths.sort();
}

export async function buildExportZip(project: Project, plan: ExportPlan, mode: ExportMode): Promise<ExportResult> {
  const zip = new JSZip();
  const packName = project.settings.packName;

  if (mode === 'pack') {
    addFiles(zip, plan.packFiles);
  } else {
    addFiles(zip, new Map([...plan.itemFiles, ...plan.recipeFiles, ...plan.glyphFiles]));
    if (mode === 'full') {
      if (project.settings.externalPackAsZip) {
        const inner = new JSZip();
        addFiles(inner, plan.packFiles);
        zip.file(`pack/external_packs/${packName}.zip`, await generate(inner), { date: FIXED_DATE });
      } else {
        addFiles(zip, plan.packFiles, `pack/external_packs/${packName}/`);
      }
      zip.file('ANLEITUNG.txt', installGuide(project, plan), { date: FIXED_DATE });
    }
  }

  const data = await generate(zip);
  return { fileName: exportFileName(project, mode), data, paths: listExportPaths(project, plan, mode) };
}

export function installGuide(project: Project, plan: ExportPlan): string {
  const packName = project.settings.packName;
  const packLocation = project.settings.externalPackAsZip
    ? `pack/external_packs/${packName}.zip`
    : `pack/external_packs/${packName}/`;
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
    `   ${packLocation.padEnd(25)} -> der Resourcepack (wird von Nexo automatisch eingebunden)`,
    '',
    '2. Im Spiel oder in der Konsole ausführen:',
    '      /nexo reload all',
    '   (lädt Items, Rezepte und den Resourcepack neu – alternativ den Server neu starten)',
    '',
    '3. Items erhalten:',
    '      /nexo give <spieler> <item_id> [anzahl]   (z.B. /nexo give @s ruby_sword)',
    '   oder über das Nexo-Inventar:  /nexo inventory',
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
