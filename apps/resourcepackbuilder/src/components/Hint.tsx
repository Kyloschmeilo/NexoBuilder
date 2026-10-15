import type { ReactNode } from 'react';
import { cn } from 'cn';

/** Explanatory text block; `warning` draws attention with the warning colour. */
export function Hint({ children, warning, className }: { children: ReactNode; warning?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-relaxed [&>svg]:mt-0.5 [&>svg]:flex-none',
        warning
          ? 'border-warning text-foreground [&>svg]:text-warning'
          : 'border-border bg-muted/50 text-muted-foreground [&>svg]:text-info',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Inline code inside prose. */
export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>;
}
