/** Checks of an item's configuration (properties, field formats, custom block, furniture hitbox, stack size). */
import { getPath, isPlainObject, labelArg, MODEL_TOKEN, schemaKey } from '@resourcepackbuilder/utils';
import { compareVersions, versionSupport } from '@resourcepackbuilder/minecraft';
import {
  DIRECTIONAL_FACES,
  type Item,
  itemLabel,
  MATERIAL_PATTERN,
  propertyFrame,
  slotForMaterial,
} from '@resourcepackbuilder/core/project';
import { checkFieldValue, getPropertyValue, type PropertyDef } from '@resourcepackbuilder/core/form';
import {
  CARPENTRY_BLOCK_TYPES,
  CARPENTRY_LATE_MIN_LISTED_VERSION,
  CARPENTRY_LATE_TYPES,
  CARPENTRY_LATE_VERSION,
  CARPENTRY_VARIATION_LIMIT,
  isCarpentryBlockType,
  isReadableNexoEntry,
  NEXO_HITBOX_KINDS,
  type NexoVec3,
  parseNexoHitbox,
  parseNexoLight,
  PROPERTIES,
} from '@resourcepackbuilder/core/nexo';
import type { ItemExport } from '../types';

/** Highest custom_variation per block type (Nexo limits; the Carpentry types with variations have four) */
const BLOCK_VARIATION_LIMITS: Record<string, number> = {
  NOTEBLOCK: 1149,
  STRINGBLOCK: 127,
  CHORUSBLOCK: 63,
  ...Object.fromEntries(
    CARPENTRY_BLOCK_TYPES.filter((type) => !CARPENTRY_LATE_TYPES.includes(type)).map((type) => [type, CARPENTRY_VARIATION_LIMIT]),
  ),
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
    if (isCarpentryBlockType(type)) {
      const { settings } = itemExport.project;
      if (!settings.carpentryAddon) report('warning', 'plan.carpentryNotInstalled', { type });
      if (CARPENTRY_LATE_TYPES.includes(type) && compareVersions(settings.minecraftVersion, CARPENTRY_LATE_MIN_LISTED_VERSION) < 0) {
        report('warning', 'plan.carpentryNeedsVersion', { type, version: CARPENTRY_LATE_VERSION });
      }
    }
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

/** Warns about furniture hitbox entries whose format Nexo cannot read, and about lights inside a barrier. */
function validateHitbox(itemExport: ItemExport): void {
  const { item, report } = itemExport;
  const hitbox = getPath(item.config, ['Mechanics', 'furniture', 'hitbox']);
  if (!isPlainObject(hitbox)) return;
  // The editor's parser decides, so the editor and the checks agree on what Nexo reads
  for (const kind of NEXO_HITBOX_KINDS) {
    const value = hitbox[kind];
    const entries = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
    for (const entry of entries) {
      if (typeof entry === 'string' && entry.trim() && !isReadableNexoEntry(parseNexoHitbox(kind, entry))) {
        report('warning', 'plan.hitboxEntryInvalid', { kind, entry });
      }
    }
  }
  validateLights(itemExport, hitbox);
}

/** The entries of a list key that may also hold a single string. */
const listEntries = (value: unknown): unknown[] => (typeof value === 'string' ? [value] : Array.isArray(value) ? value : []);

/** Warns about furniture lights inside a barrier hitbox: Nexo ignores them ("lights that overlap with the barrierHitboxes"). */
function validateLights({ item, report }: ItemExport, hitbox: Record<string, unknown>): void {
  const lights = getPath(item.config, ['Mechanics', 'furniture', 'lights', 'lights']);
  const barriers = listEntries(hitbox.barriers).flatMap((entry) => {
    const barrier = parseNexoHitbox('barriers', entry);
    return barrier?.kind === 'barriers' ? [barrier] : [];
  });
  const inside = (position: NexoVec3) =>
    barriers.some(({ from, to }) =>
      position.every((value, axis) => value >= Math.min(from[axis], to[axis]) && value <= Math.max(from[axis], to[axis])),
    );
  for (const entry of listEntries(lights)) {
    const light = parseNexoLight(entry);
    if (light && inside(light.position)) report('warning', 'plan.furnitureLightInBarrier', { light: String(entry) });
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
