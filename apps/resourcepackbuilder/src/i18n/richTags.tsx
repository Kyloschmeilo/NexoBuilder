import type { ReactNode } from 'react';
import { InlineCode } from '../components/InlineCode';

/** Inline markup for `t.rich` messages used across the app. */
export const richTags = {
  b: (chunks: ReactNode) => <b className="font-semibold text-foreground">{chunks}</b>,
  mono: (chunks: ReactNode) => <span className="font-mono">{chunks}</span>,
  code: (chunks: ReactNode) => <InlineCode>{chunks}</InlineCode>,
};
