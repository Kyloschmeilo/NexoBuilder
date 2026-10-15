import type { ReactNode } from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { ContextMenuItem, ContextMenuSeparator } from '@resourcepackbuilder/ui/components/context-menu';

/** One entry of a menu that can be rendered both as a dropdown and as a context menu. */
export type MenuEntry =
  | 'separator'
  | {
      icon: ReactNode;
      label: string;
      description?: string;
      disabled?: boolean;
      destructive?: boolean;
      onSelect: () => void;
    };

/** Renders {@link MenuEntry}s with the items of a dropdown menu or a context menu. */
export function MenuEntries({ entries, kind }: { entries: MenuEntry[]; kind: 'dropdown' | 'context' }) {
  const Item = kind === 'dropdown' ? DropdownMenuItem : ContextMenuItem;
  const Separator = kind === 'dropdown' ? DropdownMenuSeparator : ContextMenuSeparator;
  return (
    <>
      {entries.map((entry, i) =>
        entry === 'separator' ? (
          <Separator key={i} />
        ) : (
          <Item
            key={i}
            variant={entry.destructive ? 'destructive' : 'default'}
            disabled={entry.disabled}
            onClick={entry.onSelect}
            className={entry.description ? 'items-start py-1.5 [&>svg]:mt-0.5' : undefined}
          >
            {entry.icon}
            <span className="flex min-w-0 flex-col">
              <span>{entry.label}</span>
              {entry.description && <span className="text-xs text-muted-foreground">{entry.description}</span>}
            </span>
          </Item>
        ),
      )}
    </>
  );
}
