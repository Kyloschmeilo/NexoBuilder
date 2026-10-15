import type { ReactNode } from 'react';
import { cn } from 'cn';

/** Small uppercase caption above a group of content, optionally with actions on the right. */
export function SectionLabel({ children, actions, className }: { children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-7 flex-wrap items-center gap-2 font-heading text-xs leading-4 font-semibold tracking-[0.14em] text-muted-foreground uppercase',
        className,
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {actions && <span className="flex items-center gap-2 font-sans tracking-normal normal-case">{actions}</span>}
    </div>
  );
}
