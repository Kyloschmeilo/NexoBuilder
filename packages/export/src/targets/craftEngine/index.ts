/** The CraftEngine pack target: one CraftEngine pack per project in plugins/CraftEngine/resources/<pack>/. */
import { buildCraftEngineItem, craftEngineItemKey, craftEngineRecipes, sectionsToYaml } from '@resourcepackbuilder/core/craftEngine';
import { recipeFrame } from '@resourcepackbuilder/core/project';
import type { JavaModelJson } from '@resourcepackbuilder/minecraft';
import type { ItemExport, ItemSections } from '../../types';
import type { BuiltItem, PackTarget, WrittenItemModels } from '../types';
import { craftEngineInstallGuide } from './installGuide';
import {
  CRAFT_ENGINE_MEDIA_FILES,
  CRAFT_ENGINE_PLUGIN_DIR,
  CRAFT_ENGINE_RELOAD_COMMAND,
  craftEngineItemFile,
  craftEngineMediaFile,
  craftEnginePackLocation,
} from './layout';
import { planCraftEnginePluginFiles } from './pluginFiles';
import { CE_ITEM_ID_PATTERN, validateCraftEngineBlock, validateCraftEngineFurniture, validateCraftEngineItem } from './validate';
import { writeCraftEngineVariants } from './variants';

export * from './installGuide';
export * from './layout';
export * from './validate';
export * from './variants';

/** What CraftEngine's config needs from the written models. */
export interface CraftEngineWrittenModels extends WrittenItemModels {
  /** The `models:` list in slot order (null = the item has a single model) */
  models: string[] | null;
  /** The written main model, which the state of a block shows */
  mainJson: JavaModelJson | null;
}

export const CRAFT_ENGINE_TARGET: PackTarget<CraftEngineWrittenModels> = {
  id: 'craftengine',
  itemIds: { pattern: CE_ITEM_ID_PATTERN, invalidCode: 'ce.itemIdInvalid' },
  itemFile: (project, folderSlugs, item) => craftEngineItemFile(project, folderSlugs, item.itemId),
  writeModels: (itemExport, main) => ({
    mainKey: main?.key ?? null,
    mainJson: main?.json ?? null,
    models: writeCraftEngineVariants(itemExport, main?.key ?? null),
  }),
  buildItem,
  yamlKey: craftEngineItemKey,
  itemYaml: (plan) => sectionsToYaml({ items: { [plan.yamlKey]: plan.config }, ...plan.sections }),
  planPluginFiles: planCraftEnginePluginFiles,
  layout: {
    pluginDir: CRAFT_ENGINE_PLUGIN_DIR,
    fileTag: 'craftengine',
    packAsZip: () => false,
    packLocation: (project) => craftEnginePackLocation(project),
    installGuide: craftEngineInstallGuide,
    reloadCommand: CRAFT_ENGINE_RELOAD_COMMAND,
    mediaFile: (project, kind) => craftEngineMediaFile(project, CRAFT_ENGINE_MEDIA_FILES[kind]),
  },
};

/** Builds the item's CraftEngine config (and the block or furniture it places, and its recipes) and checks it. */
function buildItem(itemExport: ItemExport, written: CraftEngineWrittenModels): BuiltItem {
  const { project, item } = itemExport;
  const built = buildCraftEngineItem({
    project,
    item,
    modelKey: written.mainKey,
    models: written.models,
    modelJson: written.mainJson,
  });
  if (built.rawYamlError?.kind === 'syntax') itemExport.report('error', 'plan.rawYamlError', { error: built.rawYamlError.message });
  else if (built.rawYamlError) itemExport.report('error', 'plan.rawYamlNotMapping');
  if (built.rawBlockIgnored) itemExport.report('warning', 'ce.rawBlockWithoutBlock');
  if (built.rawBlockInvalid) itemExport.report('warning', 'ce.rawBlockNotMapping');
  if (built.rawFurnitureIgnored) itemExport.report('warning', 'ce.rawFurnitureWithoutFurniture');
  if (built.furnitureIgnored) itemExport.report('error', 'ce.furnitureWithBlock');
  validateCraftEngineItem(itemExport, built.config);
  const key = craftEngineItemKey(project, item);
  const sections: ItemSections = {};
  if (built.furniture) {
    validateCraftEngineFurniture(itemExport, built.furniture, built.config);
    sections.furniture = { [key]: built.furniture };
  } else if (built.block) {
    validateCraftEngineBlock(itemExport, built.block, built.blockModel);
    sections.blocks = { [key]: built.block };
  }
  const { recipes, unsupported } = craftEngineRecipes(project, item);
  for (const recipe of unsupported) {
    itemExport.report('warning', 'ce.recipeKindUnsupported', { type: recipe.type }, [recipeFrame(recipe.key)]);
  }
  if (Object.keys(recipes).length > 0) sections.recipes = recipes;
  return Object.keys(sections).length > 0 ? { config: built.config, sections } : { config: built.config };
}
