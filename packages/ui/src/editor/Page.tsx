/**
 * The frame of an editor page: header on top, then the content, optionally with a section navigation beside it. The
 * page is a size container (`@container/page`), so it adapts to the space it gets rather than to the window: the
 * navigation sits in a sticky 180 px column from `@3xl` and turns into a select above the content below that.
 */
import type { ReactNode } from 'react';
import { cn } from 'cn';

interface PageProps {
  /** Usually a `PageHeader`. */
  header?: ReactNode;
  /** Usually a `SectionNav`. */
  nav?: ReactNode;
  /**
   * Lets the content use the full page width (tables, tile grids). Forms keep a maximum of 880 px, so lines stay
   * readable.
   */
  wide?: boolean;
  children: ReactNode;
  className?: string;
}

/** A main-area page with optional section navigation. */
export function Page({ header, nav, wide, children, className }: PageProps) {
  const content = <div className={cn('min-w-0', !wide && 'max-w-[880px]')}>{children}</div>;
  return (
    <div className="@container/page w-full">
      <div className={cn('mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 pt-3 pb-12 @3xl/page:px-6 @3xl/page:pt-4', className)}>
        {header}
        {nav ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 @3xl/page:grid-cols-[180px_minmax(0,1fr)]">
            <div className="z-10 min-w-0 @3xl/page:sticky @3xl/page:top-4 @3xl/page:self-start">{nav}</div>
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
