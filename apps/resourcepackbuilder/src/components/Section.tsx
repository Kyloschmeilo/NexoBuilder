/**
 * A titled group of content (cards, tiles, slots) on a page or in the item editor, drawn as a panel like the editor
 * primitives' `Section`: a header row with the title, a short description and actions, a hairline, then the body on
 * the surface colour.
 */
import { Children, type ReactNode } from 'react';
import { cn } from '@resourcepackbuilder/ui/cn';

interface SectionProps {
  title: ReactNode;
  /** Short help below the title. */
  description?: ReactNode;
  /** Buttons next to the title (e.g. "Add"). */
  actions?: ReactNode;
  /** Shown as a muted line in the body when set (the section has no entries yet). */
  empty?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** A panel with a header row (title, description, actions) above its entries or its empty-state line. */
export function Section({ title, description, actions, empty, className, children }: SectionProps) {
  const hasEntries = Children.toArray(children).length > 0;
  const hasBody = Boolean(empty) || hasEntries;
  return (
    <section className={cn('@container/app-section min-w-0 rounded-xl border border-line bg-surface', className)}>
      <header
        className={cn(
          'flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 @xl/app-section:px-4',
          hasBody && 'border-b border-line',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="m-0 text-title font-semibold text-text">{title}</h2>
          {description && <p className="m-0 text-meta text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
      </header>
      {hasBody && (
        <div className="flex min-w-0 flex-col gap-3 p-3 @xl/app-section:p-4">
          {empty && <p className="m-0 text-meta text-text-muted">{empty}</p>}
          {children}
        </div>
      )}
    </section>
  );
}
