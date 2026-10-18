/** Moved to `features/item/furniture`; the Model tab mounts the furniture section here until `sections.ts` does. */
import type { Item } from '@resourcepackbuilder/core/project';
import { FurnitureSection } from '../furniture';

/** The furniture section of a CraftEngine item. */
export function CraftEngineFurnitureSection({ item }: { item: Item }) {
  return <FurnitureSection item={item} />;
}
