import type { ReactElement, ReactNode } from 'react';
import { cn } from 'cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@resourcepackbuilder/ui/components/tooltip';
import { DropdownMenuItem, DropdownMenuSeparator } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { ContextMenuItem, ContextMenuSeparator } from '@resourcepackbuilder/ui/components/context-menu';

/** Shows `label` as a tooltip on `children`, which must accept the trigger props (a Button, a menu trigger, …). */
export function Tip({ label, side, children }: { label: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right'; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export type DotTone = 'error' | 'warning' | 'success' | 'busy' | 'neutral';

/** A small status indicator: square for errors, round otherwise, hollow while busy. */
export function StatusDot({ tone, title, className }: { tone: DotTone; title?: string; className?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'size-2 shrink-0 rounded-full',
        tone === 'error' && 'rounded-[1px] bg-destructive',
        tone === 'warning' && 'bg-warning',
        tone === 'success' && 'bg-success',
        tone === 'busy' && 'bg-transparent ring-[1.5px] ring-primary ring-inset',
        tone === 'neutral' && 'bg-muted-foreground',
        className,
      )}
    />
  );
}

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
