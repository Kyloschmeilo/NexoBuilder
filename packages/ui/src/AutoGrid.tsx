import type { CSSProperties, ReactNode } from 'react';
import { cn } from 'cn';

/**
 * Responsive grid whose columns are at least `min` wide; children with `col-span-full` span all columns.
 * `fit` stretches few children across the row instead of keeping empty column slots.
 */
export function AutoGrid({
  min = '14rem',
  fit,
  className,
  children,
}: {
  min?: string;
  fit?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ '--auto-grid-min': min } as CSSProperties}
      className={cn(
        'grid gap-4',
        fit
          ? 'grid-cols-[repeat(auto-fit,minmax(min(100%,var(--auto-grid-min)),1fr))]'
          : 'grid-cols-[repeat(auto-fill,minmax(min(100%,var(--auto-grid-min)),1fr))]',
        className,
      )}
    >
      {children}
    </div>
  );
}
