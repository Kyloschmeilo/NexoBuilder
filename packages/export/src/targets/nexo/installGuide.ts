/** The installation guide put into a full export (English – the exported pack is not localised). */
import type { Project } from '@resourcepackbuilder/core/project';
import type { MultiExportPlan } from '../../selection';
import type { ExportPlan } from '../../types';
import type { InstallGuideOptions } from '../types';
import { NEXO_PLUGIN_DIR, NEXO_RELOAD_COMMAND, packLocation } from './layout';
import { MULTIPACK_FILE, PAINTINGS_FILE, SOUNDS_FILE } from './rootFiles';

/** Note about sounds.yml/paintings.yml/multipack.yml – there is only one file of each on the server */
function rootFileLines(rootFiles: Map<string, string>): string[] {
  const lines: string[] = [];
  if (rootFiles.has(SOUNDS_FILE)) lines.push('   sounds.yml                -> the sounds (the OGG files are in the resource pack)');
  if (rootFiles.has(PAINTINGS_FILE)) lines.push('   paintings.yml             -> the paintings (restart the server afterwards)');
  if (rootFiles.has(MULTIPACK_FILE)) {
    lines.push('   multipack.yml             -> the template packs (put each pack into pack/template_packs/<id>)');
  }
  if (lines.length > 0) {
    const files = [SOUNDS_FILE, PAINTINGS_FILE, MULTIPACK_FILE].filter((file) => rootFiles.has(file)).join('/');
    lines.push(`   WARNING: ${files} replace existing files – back up your own entries first and copy them over.`);
  }
  return lines;
}

const USAGE = [
  '2. Run in game or in the console:',
  `      /${NEXO_RELOAD_COMMAND}`,
  '   (reloads items, recipes and the resource pack – or restart the server)',
  '',
  '3. Get the items:',
  '      /nexo give <item_id> [amount] [player]   (e.g. /nexo give ruby_sword 1 Steve)',
  '   or via the Nexo inventory:  /nexo inventory',
];

/** Guide for the export; `rootFiles` are the shared sounds.yml/paintings.yml of the archive. */
export function nexoInstallGuide(multi: MultiExportPlan, rootFiles: Map<string, string>, options: InstallGuideOptions): string {
  return multi.projects.length === 1
    ? singleGuide(multi.projects[0].project, multi.projects[0].plan, rootFiles, options)
    : multiGuide(multi, rootFiles, options);
}

/** The guide's heading; in an archive of several plugins the archive has its own, and this part is headed by the plugin. */
function heading(title: string, { prefixed }: InstallGuideOptions): string[] {
  return prefixed ? ['Nexo', '===='] : [`ResourcepackBuilder – ${title}`, '=========================================='];
}

/** Step 1: where the files go (an archive of several plugins holds plugins/Nexo/ itself). */
function extractLine({ prefixed }: InstallGuideOptions): string {
  return prefixed
    ? `1. The folder  ${NEXO_PLUGIN_DIR}/  of this ZIP archive is merged into the folder  ${NEXO_PLUGIN_DIR}/  of your server.`
    : `1. Extract the contents of this ZIP archive into the folder  ${NEXO_PLUGIN_DIR}/  of your server.`;
}

function hasFilesIn(plan: ExportPlan, dir: string): boolean {
  return [...plan.pluginFiles.keys()].some((path) => path.startsWith(dir));
}

function singleGuide(project: Project, plan: ExportPlan, rootFiles: Map<string, string>, options: InstallGuideOptions): string {
  const ids = plan.items.map((p) => `  - ${p.yamlKey}`).join('\n');
  return [
    ...heading(`project "${project.name}"`, options),
    '',
    'Installation',
    '------------',
    extractLine(options),
    '   The folders "items" and "pack" are merged with the existing folders.',
    '',
    '   items/...                 -> the item configurations',
    ...(hasFilesIn(plan, 'recipes/') ? ['   recipes/...               -> the crafting recipes'] : []),
    ...(hasFilesIn(plan, 'glyphs/') ? ['   glyphs/...                -> the glyphs (usage: <glyph:id>)'] : []),
    ...(hasFilesIn(plan, 'dialogs/') ? ['   dialogs/...               -> the dialogs (new ones need a server restart)'] : []),
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

function multiGuide(multi: MultiExportPlan, rootFiles: Map<string, string>, options: InstallGuideOptions): string {
  const lines = [
    ...heading(`${multi.projects.length} projects`, options),
    '',
    'Installation',
    '------------',
    extractLine(options),
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
      ...(plan.items.length > 0 ? plan.items.map((p) => `  - ${p.yamlKey}`) : ['  (no items)']),
      ...(project.glyphs.length > 0 ? [`  + ${project.glyphs.length} glyph(s)`] : []),
      ...(project.dialogs.length > 0 ? [`  + ${project.dialogs.length} dialog(s) in dialogs/`] : []),
      '',
    );
  }
  return lines.join('\n');
}
