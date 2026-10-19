/**
 * The sections of an editor page. A section is a panel on the page canvas: the surface colour, a hairline border and
 * the panel radius, with a header row (title, ⓘ with the description, meta, actions) above a padded body, so every
 * group of content sits on its own surface. A sub-section groups fields inside a section (e.g. one property group
 * inside Features) in an inset, slightly tinted box with its own small header; outside a section it is a panel of its
 * own.
 */
import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';
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

/** Header padding and title size per level; the title takes its colour from the header. */
const LEVELS = {
  1: { Heading: 'h2', header: 'min-h-11 px-3 py-2 @xl/section:px-4', title: 'text-title font-semibold' },
  2: { Heading: 'h3', header: 'min-h-9 px-3 py-1.5', title: 'text-label font-semibold' },
} as const;

/**
 * The 12 px gap between panels stacked in a block container. Flex and grid parents space their children with `gap`,
 * so the margin only applies when the parent is neither.
 */
const STACK_GAP = '[:not(.flex):not(.grid)>*+&]:mt-3';

/** Whether a section has a body to render below its header. */
const hasContent = (children: ReactNode) => children !== undefined && children !== null && children !== false;

/**
 * Header row shared by both levels: title, ⓘ with the full description, meta, the truncated description and actions.
 * A hairline separates it from the body.
 */
function SectionHeading({
  level,
  titleId,
  title,
  description,
  actions,
  meta,
  hasBody,
}: Omit<SectionProps, 'children' | 'className'> & { level: 1 | 2; titleId: string; hasBody: boolean }) {
  const { Heading, header, title: titleClass } = LEVELS[level];
  return (
    <header className={cn('flex items-center gap-2 text-text', header, hasBody && 'border-b border-line')}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <Heading id={titleId} className={cn('m-0 truncate', titleClass)}>
            {title}
          </Heading>
          {description && <Help>{description}</Help>}
          {meta}
        </div>
        {description && <p className="m-0 truncate text-meta text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-1.5">{actions}</div>}
    </header>
  );
}

/**
 * A top-level section of a page: a panel with a header row (title, description, actions) and a body padded 16 px
 * (12 px while the section is narrower than 36 rem). Panels stacked in a block container keep a 12 px gap.
 */
export function Section({ children, className, ...props }: SectionProps) {
  const titleId = useId();
  const hasBody = hasContent(children);
  return (
    <section
      id={props.id}
      data-section-id={props.id}
      data-slot="section"
      aria-labelledby={titleId}
      className={cn('@container/section min-w-0 scroll-mt-4 rounded-xl border border-line bg-surface', STACK_GAP, className)}
    >
      <SectionHeading level={1} titleId={titleId} hasBody={hasBody} {...props} />
      {hasBody && <div className="min-w-0 p-3 @xl/section:p-4">{children}</div>}
    </section>
  );
}

/**
 * A group of fields: inside a {@link Section} an inset box, tinted a little toward the canvas, with a hairline border
 * and a small header; on its own a panel like a section. Groups that follow each other in a block container keep a
 * 12 px gap.
 */
export function SubSection({ children, className, ...props }: SectionProps) {
  const titleId = useId();
  const hasBody = hasContent(children);
  return (
    <section
      id={props.id}
      data-section-id={props.id}
      data-slot="sub-section"
      aria-labelledby={titleId}
      className={cn(
        'min-w-0 scroll-mt-4 rounded-xl border border-line bg-surface',
        'in-data-[slot=section]:rounded-lg in-data-[slot=section]:bg-[color-mix(in_oklab,var(--surface),var(--canvas)_35%)]',
        STACK_GAP,
        className,
      )}
    >
      <SectionHeading level={2} titleId={titleId} hasBody={hasBody} {...props} />
      {hasBody && <div className="min-w-0 p-3">{children}</div>}
    </section>
  );
}
