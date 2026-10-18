/**
 * Left paddings of the sidebar tree rows, derived from the row geometry of the UI package (the indentation per level
 * is `TREE_INDENT_PX`), so the folder icon, the "add item" hint and the item thumbnails line up.
 */
import { TREE_CHEVRON_PX, TREE_GAP_PX, TREE_ICON_PX } from '@resourcepackbuilder/ui';

/** Size of an item row's thumbnail, in pixels. */
export const ITEM_THUMB_PX = 20;
/** Left padding of a folder row on the top level. */
export const FOLDER_PADDING_PX = 4;
/** Left padding that lines a folder's "add item" hint up with the folder's icon (padding + chevron + gap). */
export const FOLDER_ICON_PADDING_PX = FOLDER_PADDING_PX + TREE_CHEVRON_PX + TREE_GAP_PX;
/** Left padding of an item row: its thumbnail is centred below the folder icon of the row it belongs to. */
export const ITEM_PADDING_PX = FOLDER_ICON_PADDING_PX - (ITEM_THUMB_PX - TREE_ICON_PX) / 2;
