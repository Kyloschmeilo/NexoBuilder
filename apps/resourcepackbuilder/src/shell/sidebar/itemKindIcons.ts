/** The type glyph of each item kind (plain item, block, furniture), shared by the tree and the folder page. */
import { Armchair, Box, type LucideIcon, Sword } from 'lucide-react';
import type { ItemKind } from './treeIndex';

/** The glyph of each item kind; the tree shows it while an item has no model thumbnail. */
export const ITEM_KIND_ICONS: Record<ItemKind, LucideIcon> = { item: Sword, block: Box, furniture: Armchair };
