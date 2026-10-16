/** Checks of a CraftEngine item config (the shared property checks run over CraftEngine's form). */
import { CE_MODEL_KEYS, CE_PROPERTIES } from '@resourcepackbuilder/core/craftEngine';
import { ITEM_ID_PATTERN } from '@resourcepackbuilder/minecraft';
import type { ItemExport } from '../../types';
import { validateProperties } from '../../validate/itemConfig';

/**
 * Item IDs of CraftEngine items. CraftEngine itself accepts `.`, `-` and `/` too, but the item ID names files and
 * folders of the export, and the editor writes only these characters, so the export accepts no more.
 */
export const CE_ITEM_ID_PATTERN = ITEM_ID_PATTERN;

/** A material as CraftEngine reads it: an item ID, optionally with a namespace ("diamond", "minecraft:diamond"). */
const CE_MATERIAL_PATTERN = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

export function validateCraftEngineItem(itemExport: ItemExport, config: Record<string, unknown>): void {
  const { report } = itemExport;
  const material = config.material;
  if (typeof material !== 'string' || !CE_MATERIAL_PATTERN.test(material)) {
    report('error', 'ce.materialInvalid', { material: String(material) });
  }
  validateProperties(itemExport, CE_PROPERTIES);
  if (!CE_MODEL_KEYS.some((key) => config[key] !== undefined)) report('warning', 'ce.missingModel');
}
