import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from 'cn';
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

/** Bordered section with a chevron header that shows or hides its content. */
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
      className={cn('rounded-md border border-border transition-colors has-data-panel-open:border-input', className)}
    >
      <div className="flex items-center gap-2 rounded-md pr-2 hover:bg-muted/60">
        <CollapsibleTrigger className="group/trigger flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-2.5 pl-3 text-left font-heading text-[13px] leading-4 font-semibold tracking-[0.06em] text-foreground uppercase outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open/trigger:rotate-90" />
          <Tip label={titleHint}>
            <span className="truncate">{title}</span>
          </Tip>
          {meta && (
            <span className="ml-auto flex items-center gap-2 font-sans text-xs font-normal tracking-normal text-muted-foreground normal-case">
              {meta}
            </span>
          )}
        </CollapsibleTrigger>
        {actions}
      </div>
      <CollapsibleContent className={cn('px-3 pt-1 pb-3', contentClassName)}>{children}</CollapsibleContent>
    </Collapsible>
  );
}
