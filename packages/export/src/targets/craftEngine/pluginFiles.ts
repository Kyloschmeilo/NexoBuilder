/** The files of plugins/CraftEngine: the project's pack.yml and its item configs grouped by file. */
import { createIssue, groupBy, type Issue } from '@resourcepackbuilder/utils';
import { buildPackYml, sectionsToYaml } from '@resourcepackbuilder/core/craftEngine';
import type { Project } from '@resourcepackbuilder/core/project';
import type { PackWriter } from '../../packWriter';
import type { FileContent, ItemPlan } from '../../types';
import type { TargetPluginFiles } from '../types';
import { packYmlFile } from './layout';

export function planCraftEnginePluginFiles(project: Project, plans: ItemPlan[], _writer: PackWriter, issues: Issue[]): TargetPluginFiles {
  const pluginFiles = new Map<string, FileContent>([[packYmlFile(project), buildPackYml(project)]]);
  for (const [file, list] of groupBy(plans, (p) => p.yamlFile)) {
    const items = Object.fromEntries(list.map((p) => [p.yamlKey, p.config]));
    pluginFiles.set(file, sectionsToYaml({ items }, `project "${project.name}"`));
  }
  issues.push(...notYetExported(project, plans));
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
