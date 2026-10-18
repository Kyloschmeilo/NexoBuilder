/**
 * The sections of an editor page. A section is separated from the one above by a hairline rule and carries a small
 * muted title, so pages read as one surface instead of a stack of boxed cards. A sub-section groups fields inside a
 * section (e.g. one property group inside Features) with a slightly stronger title and no rule.
 */
import { useId, type ReactNode } from 'react';
import { cn } from 'cn';
import { Help } from './Help';

interface SectionProps {
  /**
   * Anchor of the section: written as `data-section-id` (the target of `SectionNav` and its scroll spy) and as the
   * element id.
   */
  id?: string;
  title: ReactNode;
  /** One muted line below the title, truncated; the full text is in the ⓘ popover next to the title. */
  description?: string;
  /** Ghost or outline buttons on the right of the title. */
  actions?: ReactNode;
  /** Shown right after the title (counts, pills). */
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const LEVELS = {
  1: { Heading: 'h2', title: 'text-meta font-semibold text-text-muted', description: 'text-text-faint' },
  2: { Heading: 'h3', title: 'text-label font-semibold text-text', description: 'text-text-muted' },
} as const;

/** Title row shared by both levels: title, ⓘ with the full description, meta, the truncated description and actions. */
function SectionHeading({ level, titleId, title, description, actions, meta }: SectionProps & { level: 1 | 2; titleId: string }) {
  const { Heading, ...classes } = LEVELS[level];
  return (
    <header className={cn('flex min-h-7 items-center gap-2', level === 1 ? 'mb-2.5' : 'mb-2')}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <Heading id={titleId} className={cn('m-0 truncate', classes.title)}>
            {title}
          </Heading>
          {description && <Help>{description}</Help>}
          {meta}
        </div>
        {description && <p className={cn('m-0 truncate text-meta', classes.description)}>{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-1.5">{actions}</div>}
    </header>
  );
}

/** A top-level section of a page: top rule (not on the first section), small muted title, description, actions. */
export function Section({ children, className, ...props }: SectionProps) {
  const titleId = useId();
  return (
    <section
      id={props.id}
      data-section-id={props.id}
      aria-labelledby={titleId}
      className={cn('scroll-mt-4 border-t border-line pt-2.5 pb-4 first:border-t-0 first:pt-0', className)}
    >
      <SectionHeading level={1} titleId={titleId} {...props} />
      {children}
    </section>
  );
}

/** A section inside a {@link Section}: a 13 px semibold title and no rule. */
export function SubSection({ children, className, ...props }: SectionProps) {
  const titleId = useId();
  return (
    <section id={props.id} data-section-id={props.id} aria-labelledby={titleId} className={cn('scroll-mt-4 pt-1 pb-3', className)}>
      <SectionHeading level={2} titleId={titleId} {...props} />
      {children}
    </section>
  );
}
