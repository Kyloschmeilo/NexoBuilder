/** The padded body of pages that do not use the editor `Page` frame yet. */
import type { ReactNode } from 'react';
import { cn } from 'cn';

/**
 * Centred, padded body of a main-area page. It is a size container (`@container/page`), so content can
 * adapt to the space the page actually gets rather than to the window.
 */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="@container/page w-full">
      <div
        className={cn(
          'mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 pt-5 pb-12 @3xl/page:px-8 @3xl/page:pt-6 @3xl/page:pb-16',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
