/** The shared row of the sidebar tree: the clickable row, its context menu and its hover actions. */
import type { ComponentProps, DragEvent, KeyboardEvent, ReactNode } from 'react';
import { EllipsisVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MenuEntries, type MenuEntry, Tip, treeRow, treeRowSlots } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@resourcepackbuilder/ui/components/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';

/** Enter and Space activate a focused tree row like a click. */
export function activateOnKey(action: () => void) {
  return (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
}

interface TreeRowProps extends Omit<ComponentProps<typeof ContextMenuTrigger>, 'children' | 'className' | 'title'> {
  /** Entries of the context menu and of the "more" dropdown */
  entries: MenuEntry[];
  /** Hover actions before the "more" button */
  actions?: ReactNode;
  isSelected: boolean;
  /** Drop target state and handlers of the whole row */
  drop: { isOver: boolean; handlers: Record<'onDragOver' | 'onDragLeave' | 'onDrop', (e: DragEvent) => void> };
  children: ReactNode;
}

/**
 * One row of the tree: the row itself (click selects, right click opens the context menu) and beside it the hover
 * actions with a "more" dropdown offering the same entries. The actions are siblings of the row, so their clicks
 * never reach it.
 */
export function TreeRow({ entries, actions, isSelected, drop, children, ...rowProps }: TreeRowProps) {
  const t = useTranslations('layout.sidebar');
  return (
    <div className={treeRow({ selected: isSelected, dropTarget: drop.isOver })} data-selected={isSelected || undefined} {...drop.handlers}>
      <ContextMenu>
        <ContextMenuTrigger data-testid="tree-row" aria-selected={isSelected} className={treeRowSlots.button} {...rowProps}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-68">
          <MenuEntries kind="context" entries={entries} />
        </ContextMenuContent>
      </ContextMenu>
      <span className="hidden shrink-0 items-center gap-0.5 pr-1 group-focus-within/row:flex group-hover/row:flex group-data-selected/row:flex has-data-popup-open:flex">
        {actions}
        <DropdownMenu>
          <Tip label={t('more')}>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={t('more')} />}>
              <EllipsisVertical />
            </DropdownMenuTrigger>
          </Tip>
          <DropdownMenuContent align="end" className="w-68">
            <MenuEntries kind="dropdown" entries={entries} />
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </div>
  );
}
