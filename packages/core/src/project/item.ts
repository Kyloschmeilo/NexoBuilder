/** Items: the base material (`material:` in their config) and the plain-text label. */
import { stripFormatting } from '@resourcepackbuilder/utils';
import { parseRawYaml } from '../yaml';
import type { Item } from './types';

/** The material Nexo uses when an item sets none. */
export const DEFAULT_MATERIAL = 'PAPER';

/** A Bukkit material name as exported (upper case), e.g. DIAMOND_SWORD. */
export const MATERIAL_PATTERN = /^[A-Z0-9_]+$/;

/** The item's base material (upper case, as Minecraft names it). */
export function itemMaterial(item: Item): string {
  const material = item.config.material;
  return typeof material === 'string' && material.trim() ? material.trim().toUpperCase() : DEFAULT_MATERIAL;
}

/** The material the item's additional YAML sets (`material:`), undefined when it sets none. */
export function rawYamlMaterial(item: Pick<Item, 'rawYaml'>): string | undefined {
  const raw = parseRawYaml(item.rawYaml).value?.material;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

/**
 * The material the plugin ends up with: the additional YAML's (which is written over the config) if it sets one,
 * otherwise the app's. Its case is as typed; the app's material is upper case.
 */
export function effectiveMaterial(item: Item): string {
  return rawYamlMaterial(item) ?? itemMaterial(item);
}

/** Normalises a material name while it is typed: upper case, other characters become `_`. */
export function normalizeTypedMaterial(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
}

/** The display name without formatting, or the item ID if the item has no name (for messages and lists). */
export function itemLabel(item: Pick<Item, 'displayName' | 'itemId'>): string {
  return stripFormatting(item.displayName) || item.itemId;
}
