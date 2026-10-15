import { cn } from 'cn';

/** Indentation per tree level, in pixels (runtime padding of the rows). */
export const INDENT_PX = 16;
/** Left padding of a folder row on the top level. */
export const FOLDER_PADDING_PX = 4;
/** Left padding that lines a folder's "add item" hint up with the folder's icon (padding + chevron + gap). */
export const FOLDER_ICON_PADDING_PX = 26;
/** Left padding of an item row: aligned with the folder icon of its parent, which sits after the chevron. */
export const ITEM_PADDING_PX = 22;

/** Visual row of the sidebar (tree rows and the entries below the tree); `group/row` for its parts. */
export function rowClass(isSelected: boolean, isDropTarget = false) {
  return cn(
    'group/row flex h-8 items-center rounded-sm text-sm select-none hover:bg-sidebar-accent',
    isSelected && 'bg-primary/10 ring-1 ring-primary ring-inset hover:bg-primary/15',
    isDropTarget && 'bg-primary/10 outline-1 -outline-offset-1 outline-primary outline-dashed',
  );
}

/** The focusable, clickable part of a row. */
export const rowButton =
  'flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-sm pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
export const rowIcon = 'grid shrink-0 place-items-center text-muted-foreground group-data-selected/row:text-primary';
export const rowLabel = 'min-w-0 flex-1 truncate';
export const rowBadge = 'px-1 font-mono text-xs text-muted-foreground';
