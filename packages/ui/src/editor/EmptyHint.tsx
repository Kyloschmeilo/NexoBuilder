/** One muted line that says a list or section is empty, with an optional ghost action ("No recipes yet. Add recipe"). */
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/button';

interface EmptyHintProps {
  /** The sentence, e.g. "No recipes yet." */
  children: ReactNode;
  /** Caption of the action button, e.g. "Add recipe". */
  actionLabel?: string;
  onAction?: () => void;
  /** Icon of the action; a plus by default. */
  actionIcon?: ReactNode;
  className?: string;
}

/** The empty state of a list or section. Dashed boxes are reserved for drop zones, so this is plain text. */
export function EmptyHint({ children, actionLabel, onAction, actionIcon, className }: EmptyHintProps) {
  return (
    <div className={cn('flex min-h-7.5 flex-wrap items-center gap-x-1.5 gap-y-1 text-label text-text-muted', className)}>
      <span>{children}</span>
      {actionLabel && onAction && (
        <Button type="button" variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={onAction}>
          {actionIcon ?? <Plus />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
