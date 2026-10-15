import type { ReactNode } from 'react';
import { cn } from 'cn';

/**
 * Centred, padded body of a main-area page. It is a size container (`@container/page`), so content can
 * adapt to the space the page actually gets rather than to the window.
 */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="@container/page w-full">
      <div className={cn('mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 pt-5 pb-12 @3xl/page:px-8 @3xl/page:pt-6 @3xl/page:pb-16', className)}>
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  /** Content of the square tile on the left (an icon or a thumbnail). */
  icon: ReactNode;
  title: ReactNode;
  /** Badges and facts below the title. */
  meta?: ReactNode;
  /** Buttons on the right; they wrap below the title when space runs out. */
  actions?: ReactNode;
  className?: string;
}

/** Page heading: icon tile, title with meta line and actions. Everything wraps instead of overflowing. */
export function PageHeader({ icon, title, meta, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-1 flex flex-wrap items-center gap-x-4 gap-y-3', className)}>
      <div className="grid size-16 flex-none place-items-center overflow-hidden rounded-md border border-border bg-card text-muted-foreground [&_img]:size-12 [&_img]:object-contain [&_img]:[image-rendering:pixelated]">
        {icon}
      </div>
      <div className="min-w-0 flex-[1_1_200px]">
        <h1 className="m-0 font-heading text-2xl leading-8 font-semibold tracking-wide break-words text-foreground">{title}</h1>
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap justify-end gap-2">{actions}</div>}
    </header>
  );
}
