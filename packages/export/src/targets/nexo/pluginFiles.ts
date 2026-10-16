/** The files of plugins/Nexo: item YAMLs grouped by file, recipes and glyphs, plus the media in the pack. */
import { groupBy, type Issue } from '@resourcepackbuilder/utils';
import { buildRecipeFiles, itemsToYaml, validateRecipes } from '@resourcepackbuilder/core/nexo';
import type { Project } from '@resourcepackbuilder/core/project';
import type { PackWriter } from '../../packWriter';
import type { FileContent, ItemPlan } from '../../types';
import type { TargetPluginFiles } from '../types';
import { writeMedia } from './media';

export function planNexoPluginFiles(project: Project, plans: ItemPlan[], writer: PackWriter, issues: Issue[]): TargetPluginFiles {
  const pluginFiles = new Map<string, FileContent>();
  for (const [file, list] of groupBy(plans, (p) => p.yamlFile)) {
    pluginFiles.set(
      file,
      itemsToYaml(
        list.map((p) => ({ id: p.item.itemId, config: p.config })),
        `project "${project.name}"`,
      ),
    );
  }

  const { glyphFiles, ...nexo } = writeMedia(writer, project, issues);
  const items = plans.map((p) => p.item);
  issues.push(...validateRecipes(project, items));
  for (const [path, text] of buildRecipeFiles(project, items)) pluginFiles.set(path, text);
  for (const [path, text] of glyphFiles) pluginFiles.set(path, text);
  return { pluginFiles, nexo };
}
