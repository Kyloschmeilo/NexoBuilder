/** The CraftEngine pack target: one CraftEngine pack per project in plugins/CraftEngine/resources/<pack>/. */
import { buildCraftEngineItem, craftEngineItemKey, sectionsToYaml } from '@resourcepackbuilder/core/craftEngine';
import type { ItemExport } from '../../types';
import type { PackTarget, WrittenItemModels } from '../types';
import { craftEngineInstallGuide } from './installGuide';
import { CRAFT_ENGINE_PLUGIN_DIR, CRAFT_ENGINE_RELOAD_COMMAND, craftEngineItemFile, craftEnginePackLocation } from './layout';
import { planCraftEnginePluginFiles } from './pluginFiles';
import { CE_ITEM_ID_PATTERN, validateCraftEngineItem } from './validate';
import { writeCraftEngineVariants } from './variants';

export * from './installGuide';
export * from './layout';
export * from './validate';
export * from './variants';

/** What CraftEngine's config needs from the written models. */
export interface CraftEngineWrittenModels extends WrittenItemModels {
  /** The `models:` list in slot order (null = the item has a single model) */
  models: string[] | null;
}

export const CRAFT_ENGINE_TARGET: PackTarget<CraftEngineWrittenModels> = {
  id: 'craftengine',
  itemIds: { pattern: CE_ITEM_ID_PATTERN, invalidCode: 'ce.itemIdInvalid' },
  itemFile: (project, folderSlugs, item) => craftEngineItemFile(project, folderSlugs, item.itemId),
  writeModels: (itemExport, mainKey) => ({ mainKey, models: writeCraftEngineVariants(itemExport, mainKey) }),
  buildItem,
  yamlKey: craftEngineItemKey,
  itemYaml: (plan) => sectionsToYaml({ items: { [plan.yamlKey]: plan.config } }),
  planPluginFiles: planCraftEnginePluginFiles,
  layout: {
    pluginDir: CRAFT_ENGINE_PLUGIN_DIR,
    fileTag: 'craftengine',
    packAsZip: () => false,
    packLocation: (project) => craftEnginePackLocation(project),
    installGuide: craftEngineInstallGuide,
    reloadCommand: CRAFT_ENGINE_RELOAD_COMMAND,
  },
};

/** Builds the item's CraftEngine config and checks it. */
function buildItem(itemExport: ItemExport, written: CraftEngineWrittenModels): Record<string, unknown> {
  const built = buildCraftEngineItem({
    project: itemExport.project,
    item: itemExport.item,
    modelKey: written.mainKey,
    models: written.models,
  });
  if (built.rawYamlError?.kind === 'syntax') itemExport.report('error', 'plan.rawYamlError', { error: built.rawYamlError.message });
  else if (built.rawYamlError) itemExport.report('error', 'plan.rawYamlNotMapping');
  validateCraftEngineItem(itemExport, built.config);
  return built.config;
}
