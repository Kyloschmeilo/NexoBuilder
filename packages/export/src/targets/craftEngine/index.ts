/** The CraftEngine pack target: one CraftEngine pack per project in plugins/CraftEngine/resources/<pack>/. */
import { buildCraftEngineItem, craftEngineItemKey, sectionsToYaml } from '@resourcepackbuilder/core/craftEngine';
import type { JavaModelJson } from '@resourcepackbuilder/minecraft';
import type { ItemExport } from '../../types';
import type { BuiltItem, PackTarget, WrittenItemModels } from '../types';
import { craftEngineInstallGuide } from './installGuide';
import { CRAFT_ENGINE_PLUGIN_DIR, CRAFT_ENGINE_RELOAD_COMMAND, craftEngineItemFile, craftEnginePackLocation } from './layout';
import { planCraftEnginePluginFiles } from './pluginFiles';
import { CE_ITEM_ID_PATTERN, validateCraftEngineBlock, validateCraftEngineItem } from './validate';
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
  },
};

/** Builds the item's CraftEngine config (and the block it places) and checks it. */
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
  validateCraftEngineItem(itemExport, built.config);
  if (!built.block) return { config: built.config };
  validateCraftEngineBlock(itemExport, built.block, built.blockModel);
  return { config: built.config, sections: { blocks: { [craftEngineItemKey(project, item)]: built.block } } };
}
