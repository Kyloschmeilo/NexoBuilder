/** A vertical stack of field rows, or a grid of short fields side by side (`x / y / z`, `nutrition / saturation`). */
import type { ReactNode } from 'react';
import { cn } from 'cn';

interface FieldGroupProps {
  /** Puts this many short fields side by side once the group is wide enough; one column below. */
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}

const COLUMN_CLASS = {
  1: 'flex flex-col',
  2: 'grid grid-cols-1 @lg/group:grid-cols-2',
  3: 'grid grid-cols-1 @lg/group:grid-cols-3',
} as const;

/** Field rows with the Workbench row gap. Rows in a multi-column group stack their labels as they get narrow. */
export function FieldGroup({ columns = 1, children, className }: FieldGroupProps) {
  return (
    <div data-slot="field-group" className="@container/group min-w-0">
      <div className={cn('min-w-0 gap-x-4 gap-y-2', COLUMN_CLASS[columns], className)}>{children}</div>
    </div>
  );
}
