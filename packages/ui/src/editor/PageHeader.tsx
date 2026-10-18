/**
 * The slim header of an editor page: a 40 px thumbnail tile, the title with a status beside it, one wrapping meta line,
 * and actions that never wrap (rarer actions go into the `⋯` menu).
 */
import type { ReactNode } from 'react';
import { Ellipsis } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '../components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../components/dropdown-menu';
import { useUiLabels } from '../labels';
import { MenuEntries, type MenuEntry } from '../MenuEntries';
import { Tip } from '../Tip';

interface PageHeaderProps {
  /** Content of the 40 px tile on the left: a thumbnail or an icon (icons are drawn at 20 px). */
  thumb?: ReactNode;
  /** Same as `thumb`; kept for pages that have not moved to the editor primitives yet. */
  icon?: ReactNode;
  title: ReactNode;
  /** Shown right after the title, e.g. a `StatusPill` with the issue count. */
  status?: ReactNode;
  /** Pills and facts below the title (id, folder, material, target); this line wraps. */
  meta?: ReactNode;
  /** Buttons on the right (Give, Duplicate). They stay on one line. */
  actions?: ReactNode;
  /** Entries of the `⋯` menu after the actions (Move, Copy, Delete). */
  menu?: MenuEntry[];
  className?: string;
}

/** Page heading: thumbnail tile, title with status, meta line, actions and the `⋯` menu. */
export function PageHeader({ thumb, icon, title, status, meta, actions, menu, className }: PageHeaderProps) {
  const labels = useUiLabels();
  const tile = thumb ?? icon;
  return (
    <header className={cn('flex min-h-16 flex-wrap items-center gap-x-3.5 gap-y-2', className)}>
      {tile && (
        <div className="grid size-10 flex-none place-items-center overflow-hidden rounded-md border border-line bg-surface-raised text-text-muted [&_img]:max-h-8 [&_img]:max-w-8 [&_img]:object-contain [&_img]:[image-rendering:pixelated] [&>svg]:size-5!">
          {tile}
        </div>
      )}
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="m-0 min-w-0 truncate text-page font-semibold text-text">{title}</h1>
          {status}
        </div>
        {meta && <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-meta text-text-muted">{meta}</div>}
      </div>
      {(actions || (menu && menu.length > 0)) && (
        <div className="ml-auto flex flex-none items-center gap-1.5">
          {actions}
          {menu && menu.length > 0 && (
            <DropdownMenu>
              <Tip label={labels.moreActions}>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={labels.moreActions} />}>
                  <Ellipsis />
                </DropdownMenuTrigger>
              </Tip>
              <DropdownMenuContent align="end" className="w-auto min-w-44">
                <MenuEntries entries={menu} kind="dropdown" />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </header>
  );
}
