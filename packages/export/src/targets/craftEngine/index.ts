/** The CraftEngine pack target: one CraftEngine pack per project in plugins/CraftEngine/resources/<pack>/. */
import {
  buildCraftEngineItem,
  craftEngineItemKey,
  craftEngineRecipes,
  craftEngineTranslations,
  sectionsToYaml,
} from '@resourcepackbuilder/core/craftEngine';
import { VARIANTS } from '@resourcepackbuilder/core/project';
import type { JavaModelJson } from '@resourcepackbuilder/minecraft';
import type { ItemExport, ItemSections } from '../../types';
import { validateItemModelTree } from '../../validate/itemModelTree';
import type { BuiltItem, ItemShared, PackTarget, WrittenItemModels } from '../types';
import { validateCraftEngineAttributes } from './attributes';
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
import {
  CE_ITEM_ID_PATTERN,
  validateCraftEngineBlock,
  validateCraftEngineEvents,
  validateCraftEngineFurniture,
  validateCraftEngineItem,
  validateCraftEngineLoot,
  validateCraftEngineTemplateUses,
} from './validate';
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
    // CraftEngine has no dialogs
    mediaFile: (project, kind) => (kind === 'dialog' ? null : craftEngineMediaFile(project, CRAFT_ENGINE_MEDIA_FILES[kind])),
  },
};

/** Builds the item's CraftEngine config (and the block or furniture it places, and its recipes) and checks it. */
function buildItem(itemExport: ItemExport, written: CraftEngineWrittenModels, shared: ItemShared): BuiltItem {
  const { project, item } = itemExport;
  const built = buildCraftEngineItem({
    project,
    item,
    modelKey: written.mainKey,
    models: written.models,
    modelJson: written.mainJson,
    armor: shared.armor,
  });
  if (built.rawYamlError?.kind === 'syntax') itemExport.report('error', 'plan.rawYamlError', { error: built.rawYamlError.message });
  else if (built.rawYamlError) itemExport.report('error', 'plan.rawYamlNotMapping');
  if (built.rawBlockIgnored) itemExport.report('warning', 'ce.rawBlockWithoutBlock');
  if (built.rawBlockInvalid) itemExport.report('warning', 'ce.rawBlockNotMapping');
  if (built.rawFurnitureIgnored) itemExport.report('warning', 'ce.rawFurnitureWithoutFurniture');
  if (built.furnitureIgnored) itemExport.report('error', 'ce.furnitureWithBlock');
  if (built.itemModelTreeIgnored) itemExport.report('warning', 'plan.itemModelTreeOverriddenByRawYaml');
  else validateItemModelTree(itemExport, written.mainKey !== null);
  if (built.itemModelTreeReplacesModels) {
    const slots = VARIANTS.filter((def) => def.kind === 'pack' && (item.variants?.[def.slot]?.length ?? 0) > 0).map((def) => def.slot);
    itemExport.report('warning', 'plan.itemModelTreeReplacesGenerated', { slots: slots.join(', ') });
  }
  if (built.rawBehaviorsOverride) itemExport.report('warning', 'ce.rawBehaviorsOverride');
  if (built.placementTypeIgnored) itemExport.report('warning', 'ce.placementTypeIgnored', { type: built.placementTypeIgnored });
  for (const locale of craftEngineTranslations(item).invalidLocales)
    itemExport.report('warning', 'ce.translationLocaleInvalid', { locale });
  validateCraftEngineItem(itemExport, built.config);
  validateCraftEngineAttributes(itemExport, built.config);
  const key = craftEngineItemKey(project, item);
  const sections: ItemSections = {};
  if (built.furniture) {
    validateCraftEngineFurniture(itemExport, built.furniture, built.config);
    validateCraftEngineEvents(itemExport, 'furniture', built.furniture);
    validateCraftEngineLoot(itemExport, 'furniture', built.furniture);
    sections.furniture = { [key]: built.furniture };
  } else if (built.block) {
    validateCraftEngineBlock(itemExport, built.block, built.blockModel);
    validateCraftEngineEvents(itemExport, 'block', built.block);
    validateCraftEngineLoot(itemExport, 'block', built.block);
    sections.blocks = { [key]: built.block };
  }
  validateCraftEngineTemplateUses(itemExport, built.config, built.furniture ?? undefined, built.block ?? undefined);
  // Recipe types CraftEngine does not read are left out; validateRecipes (pluginFiles.ts) reports them
  const recipes = craftEngineRecipes(project, item);
  if (Object.keys(recipes).length > 0) sections.recipes = recipes;
  return Object.keys(sections).length > 0 ? { config: built.config, sections } : { config: built.config };
}
