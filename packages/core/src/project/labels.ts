/** Plain-text names of project entries (for messages and lists). */
import { stripFormatting } from '@resourcepackbuilder/utils';
import type { Item } from './types';

/** The display name without formatting, or the item ID if the item has no name. */
export function itemLabel(item: Pick<Item, 'displayName' | 'nexoId'>): string {
  return stripFormatting(item.displayName) || item.nexoId;
}
