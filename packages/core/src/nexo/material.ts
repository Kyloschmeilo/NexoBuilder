/** The base material of a Nexo item (`material:` in its config). */
import type { Item } from '../project/types';

/** The material Nexo uses when an item sets none. */
export const DEFAULT_MATERIAL = 'PAPER';

/** A Bukkit material name as exported (upper case), e.g. DIAMOND_SWORD. */
export const MATERIAL_PATTERN = /^[A-Z0-9_]+$/;

/** The item's base material (upper case, as Minecraft names it). */
export function itemMaterial(item: Item): string {
  const material = item.config.material;
  return typeof material === 'string' && material.trim() ? material.trim().toUpperCase() : DEFAULT_MATERIAL;
}

/** Normalises a material name while it is typed: upper case, other characters become `_`. */
export function normalizeTypedMaterial(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
}
