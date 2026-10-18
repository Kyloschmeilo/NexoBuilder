/**
 * Moved to `features/item/furniture`; the Model tab mounts the Nexo furniture section here (with its models) until
 * `sections.ts` does.
 */
import type { Item } from '@resourcepackbuilder/core/project';
import { FurnitureSection, placesFurniture } from '../furniture';

/** The furniture section of a Nexo item that has the furniture mechanic; nothing otherwise. */
export function FurnitureModelsSection({ item }: { item: Item }) {
  return placesFurniture(item, 'nexo') ? <FurnitureSection item={item} /> : null;
}
