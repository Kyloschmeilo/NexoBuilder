/** Checks of a CraftEngine item config (the shared property checks run over CraftEngine's form). */
import { CE_PROPERTIES } from '@resourcepackbuilder/core/craftEngine';
import { itemMaterial, MATERIAL_PATTERN } from '@resourcepackbuilder/core/project';
import type { ItemExport } from '../../types';
import { validateProperties } from '../../validate/itemConfig';

/** Keys CraftEngine builds the item's look from; without one it refuses to load the item. */
const MODEL_KEYS = ['model', 'models', 'texture', 'textures', 'blueprint', 'legacy_model'];

/** Item IDs CraftEngine accepts (the path of a resource location). */
export const CE_ITEM_ID_PATTERN = /^[a-z0-9_.\-/]+$/;

export function validateCraftEngineItem(itemExport: ItemExport, config: Record<string, unknown>): void {
  const { item, report } = itemExport;
  const material = itemMaterial(item);
  if (!MATERIAL_PATTERN.test(material)) report('error', 'plan.materialInvalid', { material });
  validateProperties(itemExport, CE_PROPERTIES);
  if (!MODEL_KEYS.some((key) => config[key] !== undefined)) report('error', 'ce.missingModel');
}
