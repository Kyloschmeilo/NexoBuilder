/** Checks of an item's configuration (properties, field formats, custom block, stack size). */
import { labelArg, type IssueContext, type MessageArgs } from '../../issues';
import { versionSupport } from '../../minecraft/versions';
import { slotForMaterial } from '../../nexo/armor';
import { validateTextFormat } from '../../nexo/fieldFormat';
import type { Field } from '../../nexo/fields';
import { getPropertyValue } from '../../nexo/properties';
import { MATERIAL_PATTERN } from '../../nexo/material';
import { PROPERTIES } from '../../nexo/schema';
import { MODEL_TOKEN } from '../../tokens';
import { getPath, isPlainObject } from '../../object';
import { itemLabel } from '../../project/labels';
import type { Item } from '../../project/types';
import { fieldFrame, listEntryFrame, mapKeyFrame, propertyFrame } from '../../issueFrames';
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
        report('error', 'plan.propertyConflict', { other: labelArg(other.label) }, [frame]);
      }
    }
    for (const found of validateFieldValues(value, def.field)) {
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

interface FieldValueIssue {
  code: string;
  args?: MessageArgs;
  /** Where inside the property value: field labels, list positions and map keys */
  context: IssueContext[];
}

/** Recursively checks formats (duration, vector, color …) and number ranges within a value. */
function validateFieldValues(value: unknown, field: Field): FieldValueIssue[] {
  const found: FieldValueIssue[] = [];
  const add = (code: string, context: IssueContext[], args?: MessageArgs) => found.push({ code, context, ...(args && { args }) });
  const visit = (v: unknown, f: Field, context: IssueContext[]) => {
    if (v === undefined || v === null) return;
    switch (f.type) {
      case 'text': {
        // validateTextFormat returns a message key in the `schema` namespace
        const error = typeof v === 'string' ? validateTextFormat(f.format, v) : null;
        if (typeof v === 'string' && error) add('plan.fieldFormat', context, { value: v, error: labelArg(error) });
        break;
      }
      case 'number':
        if (typeof v !== 'number') break;
        if (f.min !== undefined && v < f.min) add('plan.fieldTooSmall', context, { value: v, min: f.min });
        if (f.max !== undefined && v > f.max) add('plan.fieldTooLarge', context, { value: v, max: f.max });
        if (f.integer && !Number.isInteger(v)) add('plan.fieldNotInteger', context);
        break;
      case 'object':
        if (!isPlainObject(v)) break;
        for (const child of f.fields) {
          if (child.key !== '*') visit(v[child.key], child, [...context, fieldFrame(child.label)]);
        }
        break;
      case 'objectList':
        if (!Array.isArray(v)) break;
        v.forEach((entry, i) => {
          if (!isPlainObject(entry)) return;
          for (const child of f.fields) visit(entry[child.key], child, [...context, listEntryFrame(i + 1), fieldFrame(child.label)]);
        });
        break;
      case 'map':
        if (!isPlainObject(v)) break;
        for (const [key, entry] of Object.entries(v)) {
          if (!f.reservedKeys?.includes(key)) visit(entry, f.value, [...context, mapKeyFrame(key)]);
        }
        break;
      default:
        break;
    }
  };
  visit(value, field, []);
  return found;
}
