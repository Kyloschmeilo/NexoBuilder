/** The files of plugins/CraftEngine: the project's pack.yml and its item configs (with their blocks) grouped by file. */
import { createIssue, groupBy, type Issue } from '@resourcepackbuilder/utils';
import { buildPackYml, sectionsToYaml } from '@resourcepackbuilder/core/craftEngine';
import type { Project } from '@resourcepackbuilder/core/project';
import type { PackWriter } from '../../packWriter';
import type { FileContent, ItemPlan } from '../../types';
import type { TargetPluginFiles } from '../types';
import { exportPackName } from '../../paths';
import { CRAFT_ENGINE_RESERVED_PACK_NAME, packYmlFile } from './layout';
import { blockProjectIssues } from './validate';

export function planCraftEnginePluginFiles(project: Project, plans: ItemPlan[], _writer: PackWriter, issues: Issue[]): TargetPluginFiles {
  const pluginFiles = new Map<string, FileContent>([[packYmlFile(project), buildPackYml(project)]]);
  for (const [file, list] of groupBy(plans, (p) => p.yamlFile)) {
    const items = Object.fromEntries(list.map((p) => [p.yamlKey, p.config]));
    const blocks = Object.assign({}, ...list.map((p) => p.sections?.blocks));
    pluginFiles.set(file, sectionsToYaml({ items, blocks }, `project "${project.name}"`));
  }
  const packName = exportPackName(project);
  if (CRAFT_ENGINE_RESERVED_PACK_NAME.test(packName)) issues.push(createIssue('error', 'ce.reservedPackName', { name: packName }));
  issues.push(...blockProjectIssues(project), ...notYetExported(project, plans));
  return { pluginFiles };
}

/** Glyphs, sounds, paintings and recipes are not written for CraftEngine yet: one note per kind the project uses. */
function notYetExported(project: Project, plans: ItemPlan[]): Issue[] {
  const recipes = plans.reduce((sum, p) => sum + p.item.recipes.length, 0);
  const counts = [
    ['ce.glyphsNotExported', project.glyphs.length],
    ['ce.soundsNotExported', project.sounds.length],
    ['ce.paintingsNotExported', project.paintings.length],
    ['ce.recipesNotExported', recipes],
  ] as const;
  return counts.filter(([, count]) => count > 0).map(([code, count]) => createIssue('info', code, { count }));
}
