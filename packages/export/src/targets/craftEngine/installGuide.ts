/** The installation guide of the CraftEngine projects in a full export (English – the exported pack is not localised). */
import type { MultiExportPlan } from '../../selection';
import type { InstallGuideOptions } from '../types';
import { CRAFT_ENGINE_PLUGIN_DIR, CRAFT_ENGINE_RELOAD_COMMAND, craftEnginePackDir } from './layout';

const RESOURCES_DIR = `${CRAFT_ENGINE_PLUGIN_DIR}/resources`;

/** Guide for the CraftEngine projects of the export (CraftEngine has no files shared between packs). */
export function craftEngineInstallGuide(
  multi: MultiExportPlan,
  _rootFiles: Map<string, string>,
  { prefixed }: InstallGuideOptions,
): string {
  const { projects } = multi;
  const example = projects.flatMap((e) => e.plan.items)[0]?.yamlKey ?? 'namespace:item_id';
  const title = projects.length === 1 ? `project "${projects[0].project.name}"` : `${projects.length} CraftEngine projects`;
  const lines = [
    // In an archive of several plugins the archive's own heading comes first; this part is headed by the plugin
    ...(prefixed ? ['CraftEngine', '==========='] : [`ResourcepackBuilder – ${title}`, '==========================================']),
    '',
    'Installation',
    '------------',
    prefixed
      ? `1. The folder  ${CRAFT_ENGINE_PLUGIN_DIR}/  of this ZIP archive is merged into the folder  ${CRAFT_ENGINE_PLUGIN_DIR}/  of your server.`
      : `1. Extract the contents of this ZIP archive into the folder  ${CRAFT_ENGINE_PLUGIN_DIR}/  of your server.`,
    `   Each project is a CraftEngine pack in its own folder under  ${RESOURCES_DIR}/ :`,
    '',
  ];
  for (const { project } of projects) {
    const dir = craftEnginePackDir(project);
    lines.push(
      `   ${`${dir}/pack.yml`.padEnd(40)} -> the pack (namespace ${project.namespace})`,
      `   ${`${dir}/configuration/`.padEnd(40)} -> the configurations (items, images, sounds …)`,
      `   ${`${dir}/resourcepack/`.padEnd(40)} -> the resource pack (CraftEngine includes it automatically)`,
    );
  }
  lines.push(
    '',
    '2. Run in game or in the console:',
    `      /${CRAFT_ENGINE_RELOAD_COMMAND}`,
    '   (reloads the items and rebuilds the resource pack; restarting the server works too)',
    // Paintings and jukebox songs are registry entries, which a client only receives when it joins. An item that plays
    // a new song fails the reload that adds the song; at the next startup CraftEngine registers the song first.
    ...(projects.some(({ project }) => project.paintings.length > 0 || project.sounds.some((s) => s.jukebox))
      ? [
          '   Players see new paintings and music discs after they rejoin. If an item plays a new music disc,',
          '   restart the server once.',
        ]
      : []),
    '',
    '3. Get the items:',
    `      /ce item give <player> <namespace:item_id> [amount]   (e.g. /ce item give Steve ${example} 1)`,
    '',
  );
  for (const { project, plan } of projects) {
    const heading = projects.length === 1 ? 'Included items' : `Project "${project.name}"`;
    lines.push(
      `Namespace: ${project.namespace} · Minecraft ${project.settings.minecraftVersion}`,
      '',
      heading,
      '-'.repeat(heading.length),
      ...(plan.items.length > 0 ? plan.items.map((p) => `  - ${p.yamlKey}`) : ['  (no items)']),
      '',
    );
  }
  return lines.join('\n');
}
