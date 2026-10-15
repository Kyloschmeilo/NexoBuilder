import type { ReactNode } from 'react';

/** Inline markup for `t.rich` messages used across the app. */
export const richTags = {
  b: (chunks: ReactNode) => <b className="font-semibold text-foreground">{chunks}</b>,
  mono: (chunks: ReactNode) => <span className="font-mono">{chunks}</span>,
  code: (chunks: ReactNode) => <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">{chunks}</code>,
};
