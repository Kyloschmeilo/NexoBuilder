import type { ReactNode } from 'react';

/** Small uppercase heading above a group of cards, optionally with actions on the right. */
export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-2 font-heading text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase first:mt-0">
      <span>{children}</span>
      <span className="flex-1" />
      {actions && <span className="flex items-center gap-2 font-sans tracking-normal normal-case">{actions}</span>}
    </div>
  );
}
