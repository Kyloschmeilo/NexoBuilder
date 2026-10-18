import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from './lib/cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/collapsible';
import { Tip } from './Tip';

interface CollapsibleSectionProps {
  title: ReactNode;
  /** Tooltip of the title (e.g. a longer description). */
  titleHint?: string;
  /** Shown after the title inside the trigger (badges, counts). */
  meta?: ReactNode;
  /** Buttons on the right of the header, outside the trigger. */
  actions?: ReactNode;
  /** Controlled state; leave both unset for an uncontrolled section. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * A panel (surface colour, hairline border, panel radius) with a chevron header that shows or hides its content; a
 * hairline separates the open header from the content.
 */
export function CollapsibleSection({
  title,
  titleHint,
  meta,
  actions,
  open,
  onOpenChange,
  defaultOpen,
  children,
  className,
  contentClassName,
}: CollapsibleSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      className={cn(
        'group/collapsible min-w-0 rounded-xl border border-line bg-surface transition-colors has-data-panel-open:border-line-strong',
        className,
      )}
    >
      <div className="flex items-center gap-2 rounded-[calc(var(--radius-panel)-1px)] pr-2 group-has-data-panel-open/collapsible:rounded-b-none group-has-data-panel-open/collapsible:border-b group-has-data-panel-open/collapsible:border-line hover:bg-muted/60">
        <CollapsibleTrigger className="group/trigger flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-2 pl-3 text-left text-label font-semibold text-foreground outline-none select-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open/trigger:rotate-90" />
          <Tip label={titleHint}>
            <span className="truncate">{title}</span>
          </Tip>
          {meta && <span className="ml-auto flex items-center gap-2 text-meta font-normal text-muted-foreground">{meta}</span>}
        </CollapsibleTrigger>
        {actions}
      </div>
      <CollapsibleContent className={cn('p-3', contentClassName)}>{children}</CollapsibleContent>
    </Collapsible>
  );
}
