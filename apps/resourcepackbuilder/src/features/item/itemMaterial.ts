import type { Item } from '@resourcepackbuilder/core/project/types';

/** The material Nexo uses when an item sets none. */
export const DEFAULT_MATERIAL = 'PAPER';

/** The item's base material (upper case, as Minecraft names it). */
export function itemMaterial(item: Item): string {
  const material = item.config.material;
  return typeof material === 'string' && material.trim() ? material.trim().toUpperCase() : DEFAULT_MATERIAL;
}

/** Normalises a typed material name while typing: upper case, other characters become `_`. */
export function typedMaterial(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
}

/** Normalises a typed item ID while typing: lower case, other characters become `_`. */
export function typedItemId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
