/**
 * Plans the complete export of a project: models, textures, armor and the pack are shared, the item
 * configs and the plugin files come from the project's pack target (see targets/).
 * The result contains finished file contents and can be zipped directly (see paths.ts for the layout).
 *
 * Convention: each domain owns its checks (nexo/<domain>/validate.ts, export/validate/* for what only
 * exists in the export, the target's own checks in targets/<target>/); this module only calls them and puts
 * their issues into the item's context.
 */
import { createIssue, inContext, type Issue, type IssueContext, issueReporter } from '@resourcepackbuilder/utils';
import { buildPackMcmeta } from '@resourcepackbuilder/minecraft';
import { getFolderSlugs, getItemsInTreeOrder, type Item, itemFrame, itemTarget, type Project } from '@resourcepackbuilder/core/project';
import { collectArmorSets, itemArmor, writeArmorSets } from './equipment';
import { writeModel } from './models';
import { PackWriter } from './packWriter';
import { isSafeRelativePath, modelPathFor } from './paths';
import { packTargetFor } from './targets';
import type { ItemShared, PackTarget } from './targets/types';
import type { ExportPlan, ItemExport, ItemPlan, PlanOptions } from './types';
import { validateFolders, validateItemIds, validateProjectSettings } from './validate/project';

export function planExport(project: Project, options: PlanOptions = {}): ExportPlan {
  const target = packTargetFor(project);
  const writer = new PackWriter(options.includeBinaries ?? true);
  const issues: Issue[] = [...validateProjectSettings(project), ...validateFolders(project)];
  const items = getItemsInTreeOrder(project);
  issues.push(...validateItemIds(items, target.itemIds));

  const armorSets = collectArmorSets(items, project.settings.minecraftVersion, issues);
  writeArmorSets(writer, project, armorSets);

  const usedVariations = new Map<string, Item>();
  const plans = items.map((item) =>
    planItem(target, project, item, writer, issues, { armor: itemArmor(item, project, armorSets), usedVariations }),
  );

  writer.json('pack.mcmeta', buildPackMcmeta(project.settings.minecraftVersion, project.settings.packDescription || project.name));
  if (project.settings.packIcon) writer.binary('pack.png', project.settings.packIcon, { level: 'warning' });

  const plugin = target.planPluginFiles(project, plans, writer, issues);
  for (const path of plugin.pluginFiles.keys()) {
    if (isSafeRelativePath(path)) continue;
    plugin.pluginFiles.delete(path);
    issues.push(createIssue('error', 'plan.unsafePath', { path }));
  }

  issues.push(...writer.issues, ...writer.duplicateIssues());
  return { target: target.id, items: plans, packFiles: writer.files, ...plugin, issues };
}

/** Writes the models of one item, builds its configuration and checks everything about it. */
function planItem(target: PackTarget, project: Project, item: Item, writer: PackWriter, issues: Issue[], shared: ItemShared): ItemPlan {
  const issueTarget = itemTarget(item);
  const frame = itemFrame(item);
  const reportIn = (issue: Issue, context: IssueContext[] = []) => issues.push(inContext(issue, [frame, ...context], issueTarget));
  const itemExport: ItemExport = {
    project,
    item,
    writer,
    modelPath: modelPathFor(project, item),
    folderSlugs: getFolderSlugs(project, item.folderId),
    report: issueReporter(issues, { target: issueTarget, context: [frame] }),
    reportIn,
    writeModel: (model, modelPath, modelFrame) =>
      writeModel(writer, project, model, modelPath, (issue) => reportIn(issue, modelFrame ? [modelFrame] : [])),
  };

  const main = item.model ? itemExport.writeModel(item.model, itemExport.modelPath, null) : null;
  const config = target.buildItem(itemExport, target.writeModels(itemExport, main?.key ?? null), shared);

  return {
    item,
    folderSlugs: itemExport.folderSlugs,
    modelKey: main?.key ?? null,
    modelFile: main?.file ?? null,
    modelJson: main?.json ?? null,
    config,
    yamlKey: target.yamlKey(project, item),
    yamlFile: target.itemFile(project, itemExport.folderSlugs, item),
  };
}
