/** The ⓘ button that shows rich help (explanations, examples, a docs link) in a popover instead of inline text. */
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from 'cn';
import { Popover, PopoverContent, PopoverTrigger } from '../components/popover';
import { useUiLabels } from '../labels';

interface HelpProps {
  /** The help content. */
  children: ReactNode;
  /** Accessible name of the button; "More information" by default. */
  label?: string;
  className?: string;
}

/** A 20 px ⓘ button; clicking it (or Enter) opens the help in a popover. */
export function Help({ children, label, className }: HelpProps) {
  const labels = useUiLabels();
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label ?? labels.moreInfo}
        className={cn(
          'inline-grid size-5 flex-none cursor-pointer place-items-center rounded-md text-text-faint outline-none hover:bg-accent hover:text-text focus-visible:ring-2 focus-visible:ring-ring data-popup-open:text-text',
          className,
        )}
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-xs gap-2 text-meta text-text">
        {children}
      </PopoverContent>
    </Popover>
  );
}
