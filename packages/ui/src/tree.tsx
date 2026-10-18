import { cva } from 'class-variance-authority';
import { cn } from './lib/cn';
import { ChevronDown, ChevronRight } from 'lucide-react';

/** Indentation per tree level, in pixels (applied as runtime padding of the rows). */
export const TREE_INDENT_PX = 16;

/**
 * A row of a tree (sidebar or a checkable selection list); `group/row` and `data-selected` style its parts.
 * `sidebar` rows sit on the sidebar background, `panel` rows inside dialogs and cards.
 */
export const treeRow = cva('group/row flex items-center rounded-sm text-sm select-none', {
  variants: {
    surface: {
      sidebar: 'h-7 hover:bg-sidebar-accent',
      panel: 'min-h-7 gap-2 pr-3 text-foreground hover:bg-muted',
    },
    selected: {
      true: 'bg-accent-soft shadow-[inset_2px_0_0_var(--accent)] hover:bg-accent-soft',
      false: '',
    },
    dropTarget: {
      true: 'bg-primary/10 outline-1 -outline-offset-1 outline-primary outline-dashed',
      false: '',
    },
  },
  defaultVariants: { surface: 'sidebar', selected: false, dropTarget: false },
});

/** Classes of the parts of a {@link treeRow}. */
export const treeRowSlots = {
  /** The focusable, clickable part of a row. */
  button:
    'flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-sm pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
  /** An icon, or a span around one. */
  icon: 'grid size-4 shrink-0 place-items-center text-muted-foreground group-data-selected/row:text-primary [&_svg]:size-4',
  label: 'min-w-0 flex-1 truncate',
  /** A count or short fact on the right. */
  count: 'px-1 font-mono text-xs whitespace-nowrap text-muted-foreground',
} as const;

/**
 * The open/closed chevron in front of a tree row that has children. With `onToggle`, clicking it toggles the row
 * without the click (or a double click) reaching the row; keyboard users toggle through the row itself.
 */
export function TreeChevron({ isOpen, onToggle }: { isOpen: boolean; onToggle?: () => void }) {
  const Icon = isOpen ? ChevronDown : ChevronRight;
  return (
    <span
      className={cn('grid w-4 shrink-0 place-items-center text-muted-foreground', onToggle && 'self-stretch hover:text-foreground')}
      onClick={
        onToggle &&
        ((e) => {
          e.stopPropagation();
          onToggle();
        })
      }
      onDoubleClick={onToggle && ((e) => e.stopPropagation())}
    >
      <Icon className="size-3.5" />
    </span>
  );
}
