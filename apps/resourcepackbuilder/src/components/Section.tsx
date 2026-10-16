import type { ReactNode } from 'react';
import { cn } from 'cn';
import { SectionLabel } from '@resourcepackbuilder/ui';
import { Empty, EmptyDescription } from '@resourcepackbuilder/ui/components/empty';

interface SectionProps {
  title: ReactNode;
  /** Short help below the title. */
  description?: ReactNode;
  /** Buttons next to the title (e.g. "Add"). */
  actions?: ReactNode;
  /** Shown in a placeholder card when set (the section has no entries yet). */
  empty?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** A titled group of content (cards, tiles, slots) on a page or in the item editor. */
export function Section({ title, description, actions, empty, className, children }: SectionProps) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div>
        <SectionLabel actions={actions}>{title}</SectionLabel>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {empty && (
        <Empty className="rounded-lg border p-5">
          <EmptyDescription className="text-xs">{empty}</EmptyDescription>
        </Empty>
      )}
      {children}
    </section>
  );
}
