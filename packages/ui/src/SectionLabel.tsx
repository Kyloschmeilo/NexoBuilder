import type { ReactNode } from 'react';
import { cn } from 'cn';

/** Small muted caption above a group of content, optionally with actions on the right. */
export function SectionLabel({ children, actions, className }: { children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-7 flex-wrap items-center gap-2 text-label font-semibold text-muted-foreground', className)}>
      <span className="min-w-0 flex-1">{children}</span>
      {actions && <span className="flex items-center gap-2 font-normal">{actions}</span>}
    </div>
  );
}
