/** The installation guide put into a full export (English – the exported pack is not localised). */
import type { Project } from '../project/types';
import { packLocation } from './paths';
import { PAINTINGS_FILE, SOUNDS_FILE } from './rootFiles';
import type { MultiExportPlan } from './selection';
import type { ExportPlan } from './types';

export const INSTALL_GUIDE_FILE = 'INSTALL.txt';

/** Note about sounds.yml/paintings.yml – there is only one file of each on the server */
function rootFileLines(rootFiles: Map<string, string>): string[] {
  const lines: string[] = [];
  if (rootFiles.has(SOUNDS_FILE)) lines.push('   sounds.yml                -> the sounds (the OGG files are in the resource pack)');
  if (rootFiles.has(PAINTINGS_FILE)) lines.push('   paintings.yml             -> the paintings (restart the server afterwards)');
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

/** Guide for the export; `rootFiles` are the shared sounds.yml/paintings.yml of the archive. */
export function installGuide(multi: MultiExportPlan, rootFiles: Map<string, string>): string {
  return multi.projects.length === 1 ? singleGuide(multi.projects[0].project, multi.projects[0].plan, rootFiles) : multiGuide(multi, rootFiles);
}

function singleGuide(project: Project, plan: ExportPlan, rootFiles: Map<string, string>): string {
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
    ...rootFileLines(rootFiles),
    `   ${packLocation(project).padEnd(25)} -> the resource pack (Nexo includes it automatically)`,
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

function multiGuide(multi: MultiExportPlan, rootFiles: Map<string, string>): string {
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
  for (const { project } of multi.projects) lines.push(`   ${project.name}: ${packLocation(project)}`);
  const extra = rootFileLines(rootFiles);
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
