/**
 * The disclosure "More options (n)" that holds the fields few items need. It opens by itself when one of them gets a
 * value, so a set value is never hidden.
 */
import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from 'cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { useUiLabels } from '../labels';

interface MoreOptionsProps {
  /** Number of fields inside, shown in brackets. */
  count?: number;
  /** Whether any field inside has a value; turning true opens the disclosure. */
  hasValue?: boolean;
  /** Caption instead of "More options". */
  label?: string;
  children: ReactNode;
  className?: string;
}

/** A collapsed group of fields below the common ones. */
export function MoreOptions({ count, hasValue = false, label, children, className }: MoreOptionsProps) {
  const labels = useUiLabels();
  const [isOpen, setIsOpen] = useState(hasValue);
  const [hadValue, setHadValue] = useState(hasValue);
  if (hadValue !== hasValue) {
    // Adjusting state while rendering: a value set from outside (paste, undo) opens the group in the same frame
    setHadValue(hasValue);
    if (hasValue) setIsOpen(true);
  }
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} data-slot="more-options" className={cn('min-w-0', className)}>
      <CollapsibleTrigger className="group/more -ml-1 inline-flex h-6.5 cursor-pointer items-center gap-1 rounded-md px-1 text-meta font-medium text-text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight className="size-3.5 transition-transform group-data-panel-open/more:rotate-90" aria-hidden />
        {label ?? labels.moreOptions}
        {count !== undefined && <span className="tabular-nums">({count})</span>}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
