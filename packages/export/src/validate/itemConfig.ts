/** Checks of an item's configuration (properties, field formats, custom block, stack size). */
import { getPath, isPlainObject, labelArg, MODEL_TOKEN, schemaKey } from '@resourcepackbuilder/utils';
import { versionSupport } from '@resourcepackbuilder/minecraft';
import { slotForMaterial } from '@resourcepackbuilder/core/project/armor';
import { checkFieldValue } from '@resourcepackbuilder/core/nexo/form/fieldSchema';
import { getPropertyValue } from '@resourcepackbuilder/core/nexo/form/properties';
import { itemLabel, MATERIAL_PATTERN } from '@resourcepackbuilder/core/project/item';
import { PROPERTIES } from '@resourcepackbuilder/core/nexo/form/schema';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { propertyFrame } from '@resourcepackbuilder/core/project/issueFrames';
import type { ItemExport } from '../types';

/** Highest custom_variation per block type (Nexo limits) */
const BLOCK_VARIATION_LIMITS: Record<string, number> = { NOTEBLOCK: 1149, STRINGBLOCK: 127, CHORUSBLOCK: 63 };

export interface ItemConfigChecks {
  /** The built configuration (what ends up in the YAML) */
  config: Record<string, unknown>;
  /** Custom block variations already used by earlier items ("TYPE:variation" → item) */
  usedVariations: Map<string, Item>;
  /** Slot given by the item's armor set (null = from the material) */
  armorSlot: string | null;
}

export function validateItemConfig(itemExport: ItemExport, { config, usedVariations, armorSlot }: ItemConfigChecks): void {
  const { item, report } = itemExport;
  const targetVersion = itemExport.project.settings.minecraftVersion;
  const material = config.material;
  if (typeof material !== 'string' || !MATERIAL_PATTERN.test(material)) {
    report('error', 'plan.materialInvalid', { material: String(material) });
  }

  for (const def of PROPERTIES) {
    const value = getPropertyValue(item, def);
    if (value === undefined) continue;
    const frame = propertyFrame(def.label);
    const support = versionSupport(targetVersion, def);
    if (support === 'tooOld')
      report('warning', 'plan.propertyNeedsVersion', { version: def.minVersion ?? '', target: targetVersion }, [frame]);
    if (support === 'removed') report('warning', 'plan.propertyRemoved', { version: def.maxVersion ?? '' }, [frame]);
    for (const conflict of def.conflicts ?? []) {
      const other = PROPERTIES.find((p) => p.id === conflict);
      if (other && getPropertyValue(item, other) !== undefined && def.id < other.id) {
        report('error', 'plan.propertyConflict', { other: labelArg(schemaKey(other.label)) }, [frame]);
      }
    }
    for (const found of checkFieldValue(value, def.field)) {
      report('warning', found.code, found.args, [frame, ...found.context]);
    }
  }

  const block = getPath(item.config, ['Mechanics', 'custom_block']);
  if (isPlainObject(block)) {
    const type = typeof block.type === 'string' ? block.type : '';
    if (!type) report('error', 'plan.blockTypeMissing');
    const variation = block.custom_variation;
    if (typeof variation === 'number' && type in BLOCK_VARIATION_LIMITS) {
      const max = BLOCK_VARIATION_LIMITS[type];
      if (variation < 1 || variation > max) report('error', 'plan.blockVariationRange', { variation, max, type });
      const key = `${type}:${variation}`;
      const other = usedVariations.get(key);
      if (other) report('error', 'plan.blockVariationDuplicate', { variation, type, other: itemLabel(other) });
      else usedVariations.set(key, item);
    }
    if (!item.model && (block.model === undefined || block.model === MODEL_TOKEN)) {
      report('warning', 'plan.blockWithoutModel');
    }
  }

  if (item.armor?.set.trim() && armorSlot === null && typeof material === 'string' && !slotForMaterial(material)) {
    const equippable = getPath(item.config, ['Components', 'equippable']);
    if (!isPlainObject(equippable) || !equippable.slot) report('warning', 'plan.armorMaterialNoSlot', { material });
  }

  const components = config.Components;
  if (isPlainObject(components)) {
    const stack = components.max_stack_size;
    if (typeof stack === 'number' && components.max_damage !== undefined && stack > 1) report('error', 'plan.damageableStackable');
  }
}
