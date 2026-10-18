/** The Nexo pack target: item configs as Nexo YAML in plugins/Nexo, the pack as an external pack. */
import { getPath } from '@resourcepackbuilder/utils';
import { ITEM_ID_PATTERN } from '@resourcepackbuilder/minecraft';
import { buildItemConfig, type ConfigAddition, glyphFilePath } from '@resourcepackbuilder/core/nexo';
import { itemMaterial, variantFrame, variantPathSuffix, VARIANTS, type VariantSlot } from '@resourcepackbuilder/core/project';
import { toYaml } from '@resourcepackbuilder/core/yaml';
import type { ItemExport } from '../../types';
import { validateItemConfig } from '../../validate/itemConfig';
import type { ItemShared, PackTarget, WrittenItemModels } from '../types';
import { nexoInstallGuide } from './installGuide';
import { writeDirectionalModels, writeItemModels } from './itemModels';
import { itemYamlFile, NEXO_PLUGIN_DIR, NEXO_RELOAD_COMMAND, packLocation } from './layout';
import { planNexoPluginFiles } from './pluginFiles';
import { PAINTINGS_FILE, SOUNDS_FILE } from './rootFiles';

export * from './installGuide';
export * from './itemModels';
export * from './layout';
export * from './media';
export * from './rootFiles';

/** Model keys of an item's variants by slot (several models for slots like pulling_models). */
export type VariantKeys = Partial<Record<VariantSlot, string | string[]>>;

/** What Nexo's config needs from the written models. */
export interface NexoWrittenModels extends WrittenItemModels {
  variantKeys: VariantKeys;
  /** Item model definition written by ResourcepackBuilder (inventory icon, connectable furniture …) */
  itemModel: string | null;
  /** Values that additional models need in the config */
  extraConfig: ConfigAddition[];
}

export const NEXO_TARGET: PackTarget<NexoWrittenModels> = {
  id: 'nexo',
  itemIds: { pattern: ITEM_ID_PATTERN, invalidCode: 'plan.itemIdInvalid' },
  itemFile: (project, folderSlugs, item) => itemYamlFile(project, folderSlugs, item.itemId),
  writeModels: (itemExport, main) => writeModels(itemExport, main?.key ?? null),
  buildItem: (itemExport, written, shared) => ({ config: buildItem(itemExport, written, shared) }),
  yamlKey: (_project, item) => item.itemId,
  itemYaml: (plan) => toYaml({ [plan.yamlKey || 'item']: plan.config }),
  planPluginFiles: planNexoPluginFiles,
  layout: {
    pluginDir: NEXO_PLUGIN_DIR,
    fileTag: 'nexo',
    packAsZip: (project) => project.settings.externalPackAsZip,
    packLocation,
    installGuide: nexoInstallGuide,
    reloadCommand: NEXO_RELOAD_COMMAND,
    mediaFile: (project, kind) => ({ glyph: glyphFilePath(project), sound: SOUNDS_FILE, painting: PAINTINGS_FILE })[kind],
  },
};

/**
 * The variants Nexo builds in, then the item model definitions ResourcepackBuilder writes for Nexo itself and the
 * face models of a directional block.
 */
function writeModels(itemExport: ItemExport, mainKey: string | null): NexoWrittenModels {
  if (!mainKey) itemExport.report('info', 'plan.missingModel');
  const variantKeys = writeVariants(itemExport, mainKey !== null);
  const packSlots = VARIANTS.filter((def) => variantKeys[def.slot] !== undefined).map((def) => def.slot);
  const itemModels = writeItemModels(itemExport, mainKey, packSlots);
  const extraConfig = [...itemModels.config, ...writeDirectionalModels(itemExport, mainKey)];
  return { mainKey, variantKeys, itemModel: itemModels.itemModel, extraConfig };
}

/**
 * Variant models that Nexo builds in via Pack.<slot> (bow, shield, fishing rod …). The hyphen in
 * their path cannot occur in item IDs and folder names – so there are no overlaps with other items.
 */
function writeVariants(itemExport: ItemExport, hasMainModel: boolean): VariantKeys {
  const { item } = itemExport;
  const keys: VariantKeys = {};
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
    const material = itemMaterial(item);
    const blocksAttacks = def.slot === 'blocking_model' && getPath(item.config, ['Components', 'blocks_attacks']) !== undefined;
    if (def.materials && !def.materials.includes(material) && !blocksAttacks) {
      itemExport.report('warning', 'plan.variantWrongMaterial', { materials: def.materials.join(' / '), material }, [frame]);
    }
  }
  return keys;
}

/** Builds the item's Nexo YAML config and checks it. */
function buildItem(itemExport: ItemExport, written: NexoWrittenModels, shared: ItemShared): Record<string, unknown> {
  const built = buildItemConfig({
    project: itemExport.project,
    item: itemExport.item,
    modelKey: written.mainKey,
    armor: shared.armor,
    variantKeys: written.variantKeys,
    itemModel: written.itemModel,
    extraConfig: written.extraConfig,
  });
  if (built.rawYamlError?.kind === 'syntax') itemExport.report('error', 'plan.rawYamlError', { error: built.rawYamlError.message });
  else if (built.rawYamlError) itemExport.report('error', 'plan.rawYamlNotMapping');
  // The item's own item_model (or the additional YAML) wins over the definition the export generated, which then goes unused
  const itemModel = (built.config.Components as Record<string, unknown> | undefined)?.item_model;
  if (written.itemModel && itemModel !== written.itemModel) {
    itemExport.report('warning', 'plan.itemModelOverridesGenerated', { itemModel: String(itemModel), generated: written.itemModel });
  }
  validateItemConfig(itemExport, { config: built.config, usedVariations: shared.usedVariations, armorSlot: shared.armor?.slot ?? null });
  return built.config;
}
