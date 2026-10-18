/** Checks of an item's configuration (properties, field formats, custom block, furniture hitbox, stack size). */
import { getPath, isPlainObject, labelArg, MODEL_TOKEN, schemaKey } from '@resourcepackbuilder/utils';
import { versionSupport } from '@resourcepackbuilder/minecraft';
import {
  DIRECTIONAL_FACES,
  type Item,
  itemLabel,
  MATERIAL_PATTERN,
  propertyFrame,
  slotForMaterial,
} from '@resourcepackbuilder/core/project';
import { checkFieldValue, getPropertyValue, type PropertyDef } from '@resourcepackbuilder/core/form';
import { PROPERTIES } from '@resourcepackbuilder/core/nexo';
import type { ItemExport } from '../types';

/** Highest custom_variation per block type (Nexo limits) */
const BLOCK_VARIATION_LIMITS: Record<string, number> = { NOTEBLOCK: 1149, STRINGBLOCK: 127, CHORUSBLOCK: 63 };

const NUMBER = String.raw`-?\d+(?:\.\d+)?`;
const OFFSET = String.raw`${NUMBER}\s*,\s*${NUMBER}\s*,\s*${NUMBER}`;
/** A coordinate of a barrier, which may be a range such as `0..2` */
const RANGE = String.raw`${NUMBER}(?:\.\.${NUMBER})?`;

/**
 * The entry formats of each hitbox kind (furniture-mechanic/hitbox in the Nexo docs): barriers `x,y,z` (ranges
 * allowed), interactions `x,y,z width,height`, shulkers `x,y,z scale length [direction] [visible]`, ghasts
 * `x,y,z scale [rotation] [visible]`.
 */
const HITBOX_PATTERNS: Record<string, RegExp> = {
  barriers: new RegExp(String.raw`^${RANGE}\s*,\s*${RANGE}\s*,\s*${RANGE}$`),
  interactions: new RegExp(String.raw`^${OFFSET}(?:\s+${NUMBER}\s*,\s*${NUMBER})?$`),
  shulkers: new RegExp(String.raw`^${OFFSET}\s+${NUMBER}\s+${NUMBER}(?:\s+[A-Za-z_]+)?(?:\s+(?:true|false))?$`, 'i'),
  ghasts: new RegExp(String.raw`^${OFFSET}\s+${NUMBER}(?:\s+${NUMBER})?(?:\s+(?:true|false))?$`, 'i'),
};

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
  const material = config.material;
  if (typeof material !== 'string' || !MATERIAL_PATTERN.test(material)) {
    report('error', 'plan.materialInvalid', { material: String(material) });
  }

  validateProperties(itemExport, PROPERTIES);

  const block = getPath(item.config, ['Mechanics', 'custom_block']);
  if (isPlainObject(block)) {
    const type = typeof block.type === 'string' ? block.type : '';
    if (!type) report('error', 'plan.blockTypeMissing');
    const directional = isPlainObject(block.directional) ? block.directional : null;
    if (directional && type && type !== 'NOTEBLOCK') report('warning', 'plan.directionalNeedsNoteblock', { type });
    if (type in BLOCK_VARIATION_LIMITS) {
      // The block's own variation and those of its directional faces (a face may reuse the block's own one)
      const faceVariations = directional ? DIRECTIONAL_FACES.map((face) => directional[`${face}_variation`]) : [];
      const variations = new Set([block.custom_variation, ...faceVariations].filter((v): v is number => typeof v === 'number'));
      const max = BLOCK_VARIATION_LIMITS[type];
      for (const variation of variations) {
        if (variation < 1 || variation > max) report('error', 'plan.blockVariationRange', { variation, max, type });
        const key = `${type}:${variation}`;
        const other = usedVariations.get(key);
        if (other) report('error', 'plan.blockVariationDuplicate', { variation, type, other: itemLabel(other) });
        else usedVariations.set(key, item);
      }
    }
    if (!item.model && (block.model === undefined || block.model === MODEL_TOKEN)) {
      report('warning', 'plan.blockWithoutModel');
    }
  }

  validateHitbox(itemExport);

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

/** Warns about furniture hitbox entries whose format Nexo cannot read. */
function validateHitbox({ item, report }: ItemExport): void {
  const hitbox = getPath(item.config, ['Mechanics', 'furniture', 'hitbox']);
  if (!isPlainObject(hitbox)) return;
  for (const [kind, pattern] of Object.entries(HITBOX_PATTERNS)) {
    const value = hitbox[kind];
    const entries = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
    for (const entry of entries) {
      if (typeof entry === 'string' && entry.trim() && !pattern.test(entry.trim())) {
        report('warning', 'plan.hitboxEntryInvalid', { kind, entry });
      }
    }
  }
}

/** Checks the item's properties among `properties` (a target's form): version support, conflicts and field values. */
export function validateProperties(itemExport: ItemExport, properties: PropertyDef[]): void {
  const { item, report } = itemExport;
  const targetVersion = itemExport.project.settings.minecraftVersion;
  for (const def of properties) {
    const value = getPropertyValue(item, def);
    if (value === undefined) continue;
    const frame = propertyFrame(def.label);
    const support = versionSupport(targetVersion, def);
    if (support === 'tooOld')
      report('warning', 'plan.propertyNeedsVersion', { version: def.minVersion ?? '', target: targetVersion }, [frame]);
    if (support === 'removed') report('warning', 'plan.propertyRemoved', { version: def.maxVersion ?? '' }, [frame]);
    for (const conflict of def.conflicts ?? []) {
      const other = properties.find((p) => p.id === conflict);
      if (other && getPropertyValue(item, other) !== undefined && def.id < other.id) {
        report('error', 'plan.propertyConflict', { other: labelArg(schemaKey(other.label)) }, [frame]);
      }
    }
    for (const found of checkFieldValue(value, def.field)) {
      report('warning', found.code, found.args, [frame, ...found.context]);
    }
  }
}
