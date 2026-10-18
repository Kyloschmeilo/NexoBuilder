/**
 * Pure helpers of the furniture editors: where each target keeps an item's furniture, the names of a CraftEngine
 * furniture's variants, and adding or removing one.
 */
import {
  CE_FURNITURE_ANCHORS,
  craftEngineFurniture,
  furnitureVariants,
  furnitureVariantsKey,
  newFurnitureVariant,
} from '@resourcepackbuilder/core/craftEngine';
import { type ConfigObject, getPath, type Item, type PackTargetId } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';

/** The YAML path of a Nexo item's furniture mechanic. */
export const NEXO_FURNITURE_PATH = ['Mechanics', 'furniture'];
/** The property id of the Nexo furniture mechanic in the form. */
export const NEXO_FURNITURE_PROPERTY = 'Mechanics.furniture';

/** The item's furniture section (CraftEngine `furniture`, Nexo `Mechanics.furniture`), null when it places none. */
export function itemFurniture(item: Item, target: PackTargetId): Record<string, unknown> | null {
  if (target === 'craftengine') return craftEngineFurniture(item.config);
  const value = getPath(item.config, NEXO_FURNITURE_PATH);
  return isPlainObject(value) ? value : null;
}

/** Whether the item places furniture, so the editor shows its Furniture section. */
export function placesFurniture(item: Item, target: PackTargetId): boolean {
  return itemFurniture(item, target) !== null;
}

/** The variants the switcher offers: ground, wall and ceiling, then the furniture's own names in their order. */
export function variantNames(furniture: Record<string, unknown>): string[] {
  const anchors: readonly string[] = CE_FURNITURE_ANCHORS;
  return [...anchors, ...Object.keys(furnitureVariants(furniture)).filter((name) => !anchors.includes(name))];
}

/** Why `name` cannot name a new variant, or null: empty, not lower case letters, digits and `_`, or taken. */
export function variantNameError(furniture: Record<string, unknown>, name: string): 'required' | 'invalid' | 'taken' | null {
  const trimmed = name.trim();
  if (!trimmed) return 'required';
  if (!/^[a-z0-9_]+$/.test(trimmed)) return 'invalid';
  return furnitureVariants(furniture)[trimmed] ? 'taken' : null;
}

const objectAt = (value: unknown): ConfigObject => (isPlainObject(value) ? (value as ConfigObject) : {});

/** The furniture with a new variant `name` (one element and one hitbox); an existing variant stays as it is. */
export function withVariant(furniture: ConfigObject, name: string): ConfigObject {
  const key = furnitureVariantsKey(furniture);
  const variants = objectAt(furniture[key]);
  if (isPlainObject(variants[name])) return furniture;
  return { ...furniture, [key]: { ...variants, [name]: newFurnitureVariant() } };
}

/** The furniture without the variant `name` and its placement rule. */
export function withoutVariant(furniture: ConfigObject, name: string): ConfigObject {
  const key = furnitureVariantsKey(furniture);
  const { [name]: _variant, ...variants } = objectAt(furniture[key]);
  const { [name]: _rule, ...rules } = objectAt(furniture.rules);
  const { rules: _rules, ...rest } = furniture;
  return { ...rest, [key]: variants, ...(Object.keys(rules).length > 0 && { rules }) };
}
