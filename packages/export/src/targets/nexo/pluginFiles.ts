/**
 * The files of plugins/Nexo: item YAMLs grouped by file, recipes, glyphs and dialogs, plus the media in the pack and
 * the project's part of multipack.yml (a root file, merged across projects).
 */
import { groupBy, isPlainObject, type Issue } from '@resourcepackbuilder/utils';
import { buildRecipeFiles, itemsToYaml, NEXO_MULTIPACK_FIELD, validateMultipack } from '@resourcepackbuilder/core/nexo';
import { pruneValue } from '@resourcepackbuilder/core/form';
import { type Project, validateRecipes } from '@resourcepackbuilder/core/project';
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
        list.map((p) => ({ id: p.yamlKey, config: p.config })),
        `project "${project.name}"`,
      ),
    );
  }

  const { glyphFiles, dialogFiles, ...media } = writeMedia(writer, project, issues);
  const items = plans.map((p) => p.item);
  issues.push(...validateRecipes(project, items));
  for (const [path, text] of buildRecipeFiles(project, items)) pluginFiles.set(path, text);
  for (const [path, text] of glyphFiles) pluginFiles.set(path, text);
  for (const [path, text] of dialogFiles) pluginFiles.set(path, text);
  issues.push(...validateMultipack(project));
  const multipack = pruneValue(project.settings.multipack, NEXO_MULTIPACK_FIELD);
  return { pluginFiles, nexo: { ...media, multipack: isPlainObject(multipack) ? multipack : null } };
}
