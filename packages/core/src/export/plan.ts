/**
 * Plans the complete export of a project: item YAMLs, models, textures, armor and all checks.
 * The result contains finished file contents and can be zipped directly (see paths.ts for the layout).
 */
import { inContext, type Issue, type IssueContext } from '../issues';
import { buildPackMcmeta } from '../minecraft/versions';
import { getPath } from '../nexo/configPath';
import { buildItemConfig } from '../nexo/itemConfig';
import { DEFAULT_MATERIAL } from '../nexo/material';
import { buildRecipeFiles, recipeKeys } from '../nexo/recipes/files';
import { validateRecipe } from '../nexo/recipes/validate';
import { VARIANTS, variantPathSuffix, type VariantSlot } from '../nexo/variants';
import { itemsToYaml } from '../nexo/yaml';
import { getFolderSlugs, getItemsInTreeOrder } from '../project/tree';
import type { Item, Project } from '../project/types';
import { collectArmorSets, itemArmor, writeArmorSets, type ItemArmor } from './armor';
import { itemFrame, itemTarget, variantFrame } from './frames';
import { writeItemModels } from './itemModels';
import { writeMedia } from './media';
import { writeModel } from './models';
import { PackWriter } from './packWriter';
import { itemYamlFile, modelPathFor } from './paths';
import type { ExportPlan, ItemExport, ItemPlan, PlanOptions } from './types';
import { validateItemConfig } from './validate/itemConfig';
import { validateFolders, validateItemIds, validateProjectSettings } from './validate/project';

export function planExport(project: Project, options: PlanOptions = {}): ExportPlan {
  const writer = new PackWriter(options.includeBinaries ?? true);
  const issues: Issue[] = [...validateProjectSettings(project), ...validateFolders(project)];
  const items = getItemsInTreeOrder(project);
  issues.push(...validateItemIds(items));

  const armorSets = collectArmorSets(items, project.settings.minecraftVersion, issues);
  writeArmorSets(writer, project, armorSets);

  const usedVariations = new Map<string, Item>();
  const plans = items.map((item) =>
    planItem(project, item, writer, issues, { armor: itemArmor(item, project, armorSets), usedVariations }),
  );

  const itemFiles = new Map<string, string>();
  for (const [file, list] of groupBy(plans, (p) => p.yamlFile)) {
    itemFiles.set(
      file,
      itemsToYaml(
        list.map((p) => ({ id: p.item.nexoId, config: p.config })),
        `project "${project.name}"`,
      ),
    );
  }

  writer.json('pack.mcmeta', buildPackMcmeta(project.settings.minecraftVersion, project.settings.packDescription || project.name));
  if (project.settings.packIcon) writer.binary('pack.png', project.settings.packIcon, { level: 'warning' });

  const media = writeMedia(writer, project, issues);

  issues.push(...writer.issues, ...writer.duplicateIssues());
  return {
    items: plans,
    packFiles: writer.files,
    itemFiles,
    recipeFiles: buildRecipeFiles(project, items),
    ...media,
    issues,
  };
}

interface ItemShared {
  armor: ItemArmor | null;
  usedVariations: Map<string, Item>;
}

/** Writes the models of one item, builds its configuration and checks everything about it. */
function planItem(project: Project, item: Item, writer: PackWriter, issues: Issue[], shared: ItemShared): ItemPlan {
  const target = itemTarget(item);
  const frame = itemFrame(item);
  const reportIn = (issue: Issue, context: IssueContext[] = []) => issues.push(inContext(issue, [frame, ...context], target));
  const itemExport: ItemExport = {
    project,
    item,
    writer,
    modelPath: modelPathFor(project, item),
    folderSlugs: getFolderSlugs(project, item.folderId),
    report: (level, code, args, context) => reportIn({ level, code, ...(args && { args }) }, context),
    reportIn,
    writeModel: (model, modelPath, modelFrame) =>
      writeModel(writer, project, model, modelPath, (issue) => reportIn(issue, modelFrame ? [modelFrame] : [])),
  };

  const main = item.model ? itemExport.writeModel(item.model, itemExport.modelPath, null) : null;
  if (!main) itemExport.report('info', 'plan.missingModel');
  const variantKeys = writeVariants(itemExport, main !== null);
  const packSlots = VARIANTS.filter((def) => variantKeys[def.slot] !== undefined).map((def) => def.slot);
  const itemModels = writeItemModels(itemExport, main?.key ?? null, packSlots);

  const built = buildItemConfig({
    project,
    item,
    modelKey: main?.key ?? null,
    armorAssetId: shared.armor?.assetId ?? null,
    armor: shared.armor,
    variantKeys,
    itemModel: itemModels.itemModel,
    extraConfig: itemModels.config,
  });
  if (built.rawYamlError?.kind === 'syntax') itemExport.report('error', 'plan.rawYamlError', { error: built.rawYamlError.message });
  else if (built.rawYamlError) itemExport.report('error', 'plan.rawYamlNotMapping');
  validateItemConfig(itemExport, { config: built.config, usedVariations: shared.usedVariations, armorSlot: shared.armor?.slot ?? null });
  const keys = recipeKeys(item);
  for (const recipe of item.recipes) {
    for (const issue of validateRecipe(recipe, project, keys.get(recipe.id) ?? recipe.type)) reportIn(issue);
  }

  return {
    item,
    folderSlugs: itemExport.folderSlugs,
    modelKey: main?.key ?? null,
    modelFile: main?.file ?? null,
    modelJson: main?.json ?? null,
    config: built.config,
    yamlFile: itemYamlFile(project, itemExport.folderSlugs, item.nexoId),
  };
}

/**
 * Variant models that Nexo builds in via Pack.<slot> (bow, shield, fishing rod …). The hyphen in
 * their path cannot occur in item IDs and folder names – so there are no overlaps with other items.
 */
function writeVariants(itemExport: ItemExport, hasMainModel: boolean): Partial<Record<VariantSlot, string | string[]>> {
  const { item } = itemExport;
  const keys: Partial<Record<VariantSlot, string | string[]>> = {};
  for (const def of VARIANTS) {
    if (def.kind !== 'pack') continue;
    const models = item.variants?.[def.slot];
    if (models === undefined) continue;
    const frame = variantFrame(def);
    if (!hasMainModel) {
      itemExport.report('error', 'plan.variantNeedsMainModel', {}, [frame]);
      continue;
    }
    if (models.length === 0) {
      itemExport.report('warning', 'plan.variantEmpty', {}, [frame]);
      continue;
    }
    const written = models.map((model, i) => {
      const suffix = variantPathSuffix(def, i);
      return itemExport.writeModel(model, `${itemExport.modelPath}-${suffix}`, variantFrame(def, suffix)).key;
    });
    keys[def.slot] = def.multiple ? written : written[0];
    const material = String(item.config.material ?? DEFAULT_MATERIAL).toUpperCase();
    const blocksAttacks = def.slot === 'blocking_model' && getPath(item.config, ['Components', 'blocks_attacks']) !== undefined;
    if (def.materials && !def.materials.includes(material) && !blocksAttacks) {
      itemExport.report('warning', 'plan.variantWrongMaterial', { materials: def.materials.join(' / '), material }, [frame]);
    }
  }
  return keys;
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) groups.set(key(value), [...(groups.get(key(value)) ?? []), value]);
  return groups;
}
