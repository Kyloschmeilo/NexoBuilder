import type { ReactNode } from 'react';

/** Inline code inside prose. */
export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>;
}
